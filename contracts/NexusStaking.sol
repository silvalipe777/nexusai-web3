// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./NexusToken.sol";
import "./NexusAgents.sol";

/**
 * @title NexusStaking
 * @dev Contrato de staking para agentes NexusAI
 * Usuários fazem stake de seus agentes NFT e ganham recompensas em NXS
 */
contract NexusStaking is Ownable, ReentrancyGuard {

    NexusToken public nexusToken;
    NexusAgents public nexusAgents;

    // Recompensas diárias por tier (em NXS com 18 decimais)
    mapping(NexusAgents.AgentTier => uint256) public dailyRewardPerTier;

    // Estrutura de stake
    struct Stake {
        uint256 tokenId;
        address owner;
        uint256 stakedAt;
        uint256 lastClaimAt;
        NexusAgents.AgentTier tier;
    }

    // Mapping de tokenId para Stake
    mapping(uint256 => Stake) public stakes;

    // Mapping de owner para array de tokenIds em stake
    mapping(address => uint256[]) public stakedTokensByOwner;

    // Total de agentes em stake
    uint256 public totalStaked;

    // Pool de recompensas
    uint256 public rewardPool;

    // Eventos
    event Staked(address indexed owner, uint256 indexed tokenId, NexusAgents.AgentTier tier);
    event Unstaked(address indexed owner, uint256 indexed tokenId, uint256 rewards);
    event RewardsClaimed(address indexed owner, uint256 indexed tokenId, uint256 amount);
    event RewardPoolFunded(uint256 amount);

    constructor(address _nexusToken, address _nexusAgents) Ownable(msg.sender) {
        nexusToken = NexusToken(_nexusToken);
        nexusAgents = NexusAgents(_nexusAgents);

        // Definir recompensas diárias por tier (em NXS)
        dailyRewardPerTier[NexusAgents.AgentTier.STARTER] = 10 * 10**18;    // 10 NXS/dia
        dailyRewardPerTier[NexusAgents.AgentTier.PRO] = 25 * 10**18;        // 25 NXS/dia
        dailyRewardPerTier[NexusAgents.AgentTier.ELITE] = 50 * 10**18;      // 50 NXS/dia
        dailyRewardPerTier[NexusAgents.AgentTier.LEGENDARY] = 100 * 10**18; // 100 NXS/dia
    }

    /**
     * @dev Faz stake de um agente
     */
    function stake(uint256 tokenId) external nonReentrant {
        require(nexusAgents.ownerOf(tokenId) == msg.sender, "Voce nao e o dono deste agente");
        require(stakes[tokenId].owner == address(0), "Agente ja esta em stake");

        // Transfere o NFT para este contrato
        nexusAgents.transferFrom(msg.sender, address(this), tokenId);

        // Obtém informações do agente
        NexusAgents.Agent memory agent = nexusAgents.getAgent(tokenId);

        // Cria o stake
        stakes[tokenId] = Stake({
            tokenId: tokenId,
            owner: msg.sender,
            stakedAt: block.timestamp,
            lastClaimAt: block.timestamp,
            tier: agent.tier
        });

        stakedTokensByOwner[msg.sender].push(tokenId);
        totalStaked++;

        emit Staked(msg.sender, tokenId, agent.tier);
    }

    /**
     * @dev Remove stake e coleta recompensas
     */
    function unstake(uint256 tokenId) external nonReentrant {
        Stake memory stakeInfo = stakes[tokenId];
        require(stakeInfo.owner == msg.sender, "Voce nao e o dono deste stake");

        // Calcula e paga recompensas pendentes
        uint256 rewards = calculateRewards(tokenId);
        if (rewards > 0 && rewards <= rewardPool) {
            rewardPool -= rewards;
            nexusToken.transfer(msg.sender, rewards);
        }

        // Devolve o NFT
        nexusAgents.transferFrom(address(this), msg.sender, tokenId);

        // Remove do array de stakes do owner
        _removeFromStakedTokens(msg.sender, tokenId);

        // Limpa o stake
        delete stakes[tokenId];
        totalStaked--;

        emit Unstaked(msg.sender, tokenId, rewards);
    }

    /**
     * @dev Coleta recompensas sem fazer unstake
     */
    function claimRewards(uint256 tokenId) external nonReentrant {
        Stake storage stakeInfo = stakes[tokenId];
        require(stakeInfo.owner == msg.sender, "Voce nao e o dono deste stake");

        uint256 rewards = calculateRewards(tokenId);
        require(rewards > 0, "Sem recompensas disponiveis");
        require(rewards <= rewardPool, "Pool de recompensas insuficiente");

        rewardPool -= rewards;
        stakeInfo.lastClaimAt = block.timestamp;

        nexusToken.transfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, tokenId, rewards);
    }

    /**
     * @dev Coleta recompensas de todos os stakes do usuário
     */
    function claimAllRewards() external nonReentrant {
        uint256[] memory userStakes = stakedTokensByOwner[msg.sender];
        require(userStakes.length > 0, "Voce nao tem agentes em stake");

        uint256 totalRewards = 0;

        for (uint256 i = 0; i < userStakes.length; i++) {
            uint256 tokenId = userStakes[i];
            uint256 rewards = calculateRewards(tokenId);

            if (rewards > 0) {
                totalRewards += rewards;
                stakes[tokenId].lastClaimAt = block.timestamp;
            }
        }

        require(totalRewards > 0, "Sem recompensas disponiveis");
        require(totalRewards <= rewardPool, "Pool de recompensas insuficiente");

        rewardPool -= totalRewards;
        nexusToken.transfer(msg.sender, totalRewards);
    }

    /**
     * @dev Calcula recompensas pendentes para um tokenId
     */
    function calculateRewards(uint256 tokenId) public view returns (uint256) {
        Stake memory stakeInfo = stakes[tokenId];
        if (stakeInfo.owner == address(0)) return 0;

        uint256 timeStaked = block.timestamp - stakeInfo.lastClaimAt;
        uint256 dailyReward = dailyRewardPerTier[stakeInfo.tier];

        // Recompensa proporcional ao tempo (em segundos)
        return (dailyReward * timeStaked) / 1 days;
    }

    /**
     * @dev Retorna total de recompensas pendentes do usuário
     */
    function getTotalPendingRewards(address owner) external view returns (uint256) {
        uint256[] memory userStakes = stakedTokensByOwner[owner];
        uint256 total = 0;

        for (uint256 i = 0; i < userStakes.length; i++) {
            total += calculateRewards(userStakes[i]);
        }

        return total;
    }

    /**
     * @dev Retorna todos os stakes do usuário
     */
    function getStakesByOwner(address owner) external view returns (Stake[] memory) {
        uint256[] memory tokenIds = stakedTokensByOwner[owner];
        Stake[] memory userStakes = new Stake[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            userStakes[i] = stakes[tokenIds[i]];
        }

        return userStakes;
    }

    /**
     * @dev Adiciona fundos ao pool de recompensas
     */
    function fundRewardPool(uint256 amount) external {
        require(nexusToken.transferFrom(msg.sender, address(this), amount), "Transferencia falhou");
        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }

    /**
     * @dev Atualiza recompensa diária por tier (apenas owner)
     */
    function setDailyReward(NexusAgents.AgentTier tier, uint256 reward) external onlyOwner {
        dailyRewardPerTier[tier] = reward;
    }

    /**
     * @dev Remove tokenId do array de stakes do owner
     */
    function _removeFromStakedTokens(address owner, uint256 tokenId) internal {
        uint256[] storage tokens = stakedTokensByOwner[owner];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }

    /**
     * @dev Retira NXS excedente do pool (apenas owner)
     */
    function withdrawExcessRewards(uint256 amount) external onlyOwner {
        require(amount <= rewardPool, "Amount maior que o pool");
        rewardPool -= amount;
        nexusToken.transfer(owner(), amount);
    }

    // Necessário para receber NFTs via safeTransferFrom
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
