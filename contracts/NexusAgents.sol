// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./NexusToken.sol";

/**
 * @title NexusAgents
 * @dev Contrato NFT ERC-721 para agentes de IA do NexusAI
 */
contract NexusAgents is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    NexusToken public nexusToken;

    // Tiers de agentes
    enum AgentTier { STARTER, PRO, ELITE, LEGENDARY }

    // Estrutura do Agente
    struct Agent {
        uint256 id;
        string name;
        AgentTier tier;
        uint256 power;
        uint256 intelligence;
        uint256 speed;
        uint256 mintedAt;
        bool isStaked;
    }

    // Preços por tier (em ETH)
    mapping(AgentTier => uint256) public tierPriceETH;
    // Preços por tier (em NXS)
    mapping(AgentTier => uint256) public tierPriceNXS;

    // Mapping de tokenId para Agent
    mapping(uint256 => Agent) public agents;

    // Supply máximo por tier
    mapping(AgentTier => uint256) public maxSupplyPerTier;
    mapping(AgentTier => uint256) public currentSupplyPerTier;

    // Eventos
    event AgentMinted(address indexed owner, uint256 indexed tokenId, AgentTier tier, string name);
    event AgentStaked(uint256 indexed tokenId, address indexed owner);
    event AgentUnstaked(uint256 indexed tokenId, address indexed owner);
    event PriceUpdated(AgentTier tier, uint256 priceETH, uint256 priceNXS);

    constructor(address _nexusToken) ERC721("NexusAI Agent", "NXSA") Ownable(msg.sender) {
        nexusToken = NexusToken(_nexusToken);

        // Definir preços iniciais em ETH (wei)
        tierPriceETH[AgentTier.STARTER] = 0.01 ether;
        tierPriceETH[AgentTier.PRO] = 0.05 ether;
        tierPriceETH[AgentTier.ELITE] = 0.15 ether;
        tierPriceETH[AgentTier.LEGENDARY] = 0.5 ether;

        // Definir preços em NXS (com 18 decimais)
        tierPriceNXS[AgentTier.STARTER] = 100 * 10**18;
        tierPriceNXS[AgentTier.PRO] = 500 * 10**18;
        tierPriceNXS[AgentTier.ELITE] = 1500 * 10**18;
        tierPriceNXS[AgentTier.LEGENDARY] = 5000 * 10**18;

        // Supply máximo por tier
        maxSupplyPerTier[AgentTier.STARTER] = 10000;
        maxSupplyPerTier[AgentTier.PRO] = 5000;
        maxSupplyPerTier[AgentTier.ELITE] = 2000;
        maxSupplyPerTier[AgentTier.LEGENDARY] = 500;
    }

    /**
     * @dev Mint de agente pagando com ETH
     */
    function mintWithETH(
        string memory name,
        AgentTier tier,
        string memory tokenURI_
    ) external payable returns (uint256) {
        require(msg.value >= tierPriceETH[tier], "ETH insuficiente");
        require(currentSupplyPerTier[tier] < maxSupplyPerTier[tier], "Supply maximo atingido para este tier");

        uint256 tokenId = _mintAgent(msg.sender, name, tier, tokenURI_);

        // Devolve troco se enviou mais ETH
        if (msg.value > tierPriceETH[tier]) {
            payable(msg.sender).transfer(msg.value - tierPriceETH[tier]);
        }

        return tokenId;
    }

    /**
     * @dev Mint de agente pagando com NXS tokens
     */
    function mintWithNXS(
        string memory name,
        AgentTier tier,
        string memory tokenURI_
    ) external returns (uint256) {
        uint256 price = tierPriceNXS[tier];
        require(nexusToken.balanceOf(msg.sender) >= price, "NXS insuficiente");
        require(nexusToken.allowance(msg.sender, address(this)) >= price, "Aprove os tokens primeiro");
        require(currentSupplyPerTier[tier] < maxSupplyPerTier[tier], "Supply maximo atingido para este tier");

        // Transfere NXS do usuário para o contrato
        nexusToken.transferFrom(msg.sender, address(this), price);

        return _mintAgent(msg.sender, name, tier, tokenURI_);
    }

    /**
     * @dev Função interna de mint
     */
    function _mintAgent(
        address to,
        string memory name,
        AgentTier tier,
        string memory tokenURI_
    ) internal returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        // Gera stats baseados no tier
        (uint256 power, uint256 intelligence, uint256 speed) = _generateStats(tier);

        agents[tokenId] = Agent({
            id: tokenId,
            name: name,
            tier: tier,
            power: power,
            intelligence: intelligence,
            speed: speed,
            mintedAt: block.timestamp,
            isStaked: false
        });

        currentSupplyPerTier[tier]++;

        emit AgentMinted(to, tokenId, tier, name);

        return tokenId;
    }

    /**
     * @dev Gera stats aleatórios baseados no tier
     */
    function _generateStats(AgentTier tier) internal view returns (uint256 power, uint256 intelligence, uint256 speed) {
        uint256 baseMin;
        uint256 baseMax;

        if (tier == AgentTier.STARTER) {
            baseMin = 40;
            baseMax = 60;
        } else if (tier == AgentTier.PRO) {
            baseMin = 60;
            baseMax = 80;
        } else if (tier == AgentTier.ELITE) {
            baseMin = 80;
            baseMax = 95;
        } else {
            baseMin = 95;
            baseMax = 100;
        }

        // Pseudo-random baseado em block data
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));

        power = baseMin + (rand % (baseMax - baseMin + 1));
        intelligence = baseMin + ((rand / 100) % (baseMax - baseMin + 1));
        speed = baseMin + ((rand / 10000) % (baseMax - baseMin + 1));
    }

    /**
     * @dev Retorna informações do agente
     */
    function getAgent(uint256 tokenId) external view returns (Agent memory) {
        require(_ownerOf(tokenId) != address(0), "Agente nao existe");
        return agents[tokenId];
    }

    /**
     * @dev Retorna todos os agentes de um owner
     */
    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @dev Atualiza preços (apenas owner)
     */
    function setTierPrice(AgentTier tier, uint256 priceETH, uint256 priceNXS) external onlyOwner {
        tierPriceETH[tier] = priceETH;
        tierPriceNXS[tier] = priceNXS;
        emit PriceUpdated(tier, priceETH, priceNXS);
    }

    /**
     * @dev Retira ETH do contrato (apenas owner)
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Sem ETH");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Retira NXS do contrato (apenas owner)
     */
    function withdrawNXS() external onlyOwner {
        uint256 balance = nexusToken.balanceOf(address(this));
        require(balance > 0, "Sem NXS");
        nexusToken.transfer(owner(), balance);
    }

    // Overrides necessários
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
