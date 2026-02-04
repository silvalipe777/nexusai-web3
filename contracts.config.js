// ================================
// ThreadSTR - Configuração dos Contratos
// ================================

// Endereços dos contratos (atualizar após deploy)
const CONTRACT_ADDRESSES = {
    // Localhost (Hardhat)
    localhost: {
        NexusToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        NexusAgents: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        NexusStaking: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    },
    // Sepolia Testnet
    sepolia: {
        NexusToken: "",
        NexusAgents: "",
        NexusStaking: ""
    },
    // Mumbai Testnet
    mumbai: {
        NexusToken: "",
        NexusAgents: "",
        NexusStaking: ""
    },
    // Base Mainnet
    base: {
        NexusToken: "",
        NexusAgents: "",
        NexusStaking: ""
    },
    // Base Sepolia Testnet
    baseSepolia: {
        NexusToken: "",
        NexusAgents: "",
        NexusStaking: ""
    }
};

// ABIs simplificados dos contratos
const CONTRACT_ABIS = {
    NexusToken: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function transferFrom(address from, address to, uint256 amount) returns (bool)",
        "function tokenPrice() view returns (uint256)",
        "function buyTokens() payable",
        "function calculateTokenAmount(uint256 ethAmount) view returns (uint256)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
        "event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost)"
    ],

    NexusAgents: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address owner) view returns (uint256)",
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function tokenURI(uint256 tokenId) view returns (string)",
        "function approve(address to, uint256 tokenId)",
        "function setApprovalForAll(address operator, bool approved)",
        "function getApproved(uint256 tokenId) view returns (address)",
        "function isApprovedForAll(address owner, address operator) view returns (bool)",
        "function transferFrom(address from, address to, uint256 tokenId)",
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
        "function tierPriceETH(uint8 tier) view returns (uint256)",
        "function tierPriceNXS(uint8 tier) view returns (uint256)",
        "function maxSupplyPerTier(uint8 tier) view returns (uint256)",
        "function currentSupplyPerTier(uint8 tier) view returns (uint256)",
        "function mintWithETH(string name, uint8 tier, string tokenURI) payable returns (uint256)",
        "function mintWithNXS(string name, uint8 tier, string tokenURI) returns (uint256)",
        "function getAgent(uint256 tokenId) view returns (tuple(uint256 id, string name, uint8 tier, uint256 power, uint256 intelligence, uint256 speed, uint256 mintedAt, bool isStaked))",
        "function getAgentsByOwner(address owner) view returns (uint256[])",
        "event AgentMinted(address indexed owner, uint256 indexed tokenId, uint8 tier, string name)",
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    ],

    NexusStaking: [
        "function totalStaked() view returns (uint256)",
        "function rewardPool() view returns (uint256)",
        "function dailyRewardPerTier(uint8 tier) view returns (uint256)",
        "function stakes(uint256 tokenId) view returns (tuple(uint256 tokenId, address owner, uint256 stakedAt, uint256 lastClaimAt, uint8 tier))",
        "function stake(uint256 tokenId)",
        "function unstake(uint256 tokenId)",
        "function claimRewards(uint256 tokenId)",
        "function claimAllRewards()",
        "function calculateRewards(uint256 tokenId) view returns (uint256)",
        "function getTotalPendingRewards(address owner) view returns (uint256)",
        "function getStakesByOwner(address owner) view returns (tuple(uint256 tokenId, address owner, uint256 stakedAt, uint256 lastClaimAt, uint8 tier)[])",
        "event Staked(address indexed owner, uint256 indexed tokenId, uint8 tier)",
        "event Unstaked(address indexed owner, uint256 indexed tokenId, uint256 rewards)",
        "event RewardsClaimed(address indexed owner, uint256 indexed tokenId, uint256 amount)"
    ]
};

// Tier enum mapping
const AGENT_TIERS = {
    STARTER: 0,
    PRO: 1,
    ELITE: 2,
    LEGENDARY: 3
};

// Chain IDs
const CHAIN_IDS = {
    mainnet: 1,
    sepolia: 11155111,
    goerli: 5,
    mumbai: 80001,
    localhost: 31337,
    base: 8453,
    baseSepolia: 84532
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.CONTRACT_ADDRESSES = CONTRACT_ADDRESSES;
    window.CONTRACT_ABIS = CONTRACT_ABIS;
    window.AGENT_TIERS = AGENT_TIERS;
    window.CHAIN_IDS = CHAIN_IDS;
}
