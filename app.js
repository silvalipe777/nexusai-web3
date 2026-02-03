// ================================
// NEXUSAI - Web3 Application
// Base Network Integration
// ================================

// Base Network Configuration
const BASE_CHAIN = {
    chainId: '0x2105', // 8453 in hex
    chainName: 'Base',
    nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org']
};

const BASE_TESTNET = {
    chainId: '0x14A34', // 84532 in hex (Base Sepolia)
    chainName: 'Base Sepolia',
    nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org']
};

// ================================
// Web3 Module - Wallet & Blockchain
// ================================

const Web3App = {
    wallet: null,
    provider: null,
    signer: null,
    ethBalance: 0,
    nxsBalance: 0,
    ownedAgents: [],
    chainId: null,

    // Connect to MetaMask or other wallet
    async connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request account access
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });

                if (accounts.length > 0) {
                    this.wallet = {
                        address: accounts[0],
                        shortAddress: accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4)
                    };

                    // Setup provider
                    if (typeof ethers !== 'undefined') {
                        this.provider = new ethers.providers.Web3Provider(window.ethereum);
                        this.signer = this.provider.getSigner();
                    }

                    // Get chain ID
                    this.chainId = await window.ethereum.request({ method: 'eth_chainId' });

                    // Check if on Base network
                    if (this.chainId !== BASE_CHAIN.chainId && this.chainId !== BASE_TESTNET.chainId) {
                        await this.switchToBase();
                    }

                    // Get ETH balance
                    await this.updateBalances();

                    // Load owned agents
                    const saved = localStorage.getItem('nexus_owned_agents');
                    this.ownedAgents = saved ? JSON.parse(saved) : [];

                    // Save wallet
                    this.saveWalletState();

                    // Setup event listeners
                    this.setupWalletEvents();

                    this.updateWalletUI();
                    UI.showToast('Wallet connected!', 'success');
                }
            } catch (error) {
                console.error('Connection error:', error);
                UI.showToast('Failed to connect wallet', 'error');
            }
        } else {
            // No MetaMask - use demo mode
            const confirmed = confirm('MetaMask not detected.\n\nWould you like to use demo mode?');

            if (confirmed) {
                this.useDemoMode();
            }
        }
    },

    // Switch to Base network
    async switchToBase() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN.chainId }]
            });
        } catch (switchError) {
            // Chain not added, add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BASE_CHAIN]
                    });
                } catch (addError) {
                    console.error('Failed to add Base network:', addError);
                    UI.showToast('Please add Base network to your wallet', 'error');
                }
            }
        }
    },

    // Demo mode for testing without wallet
    useDemoMode() {
        const address = '0x' + Array.from({length: 40}, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');

        this.wallet = {
            address: address,
            shortAddress: address.slice(0, 6) + '...' + address.slice(-4)
        };

        this.ethBalance = (Math.random() * 2 + 0.1).toFixed(4);
        this.nxsBalance = Math.floor(Math.random() * 500) + 100;

        const saved = localStorage.getItem('nexus_owned_agents');
        this.ownedAgents = saved ? JSON.parse(saved) : [];

        this.saveWalletState();
        this.updateWalletUI();
        UI.showToast('Demo mode activated!', 'success');
    },

    // Setup wallet event listeners
    setupWalletEvents() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.wallet.address = accounts[0];
                    this.wallet.shortAddress = accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4);
                    this.updateBalances();
                    this.updateWalletUI();
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                this.chainId = chainId;
                this.updateWalletUI();
                window.location.reload();
            });
        }
    },

    // Update balances from blockchain
    async updateBalances() {
        if (this.provider && this.wallet) {
            try {
                const balance = await this.provider.getBalance(this.wallet.address);
                this.ethBalance = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);

                // TODO: Get NXS token balance from contract
                // For now, use stored balance
                const saved = localStorage.getItem('nexus_wallet');
                if (saved) {
                    const data = JSON.parse(saved);
                    this.nxsBalance = data.nxsBalance || 0;
                }
            } catch (error) {
                console.error('Balance fetch error:', error);
            }
        }
    },

    // Save wallet state to localStorage
    saveWalletState() {
        localStorage.setItem('nexus_wallet', JSON.stringify({
            address: this.wallet.address,
            ethBalance: this.ethBalance,
            nxsBalance: this.nxsBalance
        }));
    },

    // Load wallet from storage
    loadWallet() {
        const saved = localStorage.getItem('nexus_wallet');
        if (saved) {
            const data = JSON.parse(saved);
            this.wallet = {
                address: data.address,
                shortAddress: data.address.slice(0, 6) + '...' + data.address.slice(-4)
            };
            this.ethBalance = data.ethBalance;
            this.nxsBalance = data.nxsBalance;

            const agents = localStorage.getItem('nexus_owned_agents');
            this.ownedAgents = agents ? JSON.parse(agents) : [];

            this.updateWalletUI();
        }
    },

    // Disconnect wallet
    disconnectWallet() {
        this.wallet = null;
        this.provider = null;
        this.signer = null;
        this.ethBalance = 0;
        this.nxsBalance = 0;
        localStorage.removeItem('nexus_wallet');
        this.updateWalletUI();
        UI.showToast('Wallet disconnected', 'success');
        UI.closeProfileModal();
    },

    // Update wallet UI
    updateWalletUI() {
        const walletBtn = document.getElementById('connectWallet');
        const walletText = document.getElementById('walletText');
        const tokenBalance = document.getElementById('tokenBalance');
        const walletNotConnected = document.getElementById('walletNotConnected');
        const walletConnected = document.getElementById('walletConnected');
        const walletAddress = document.getElementById('walletAddress');
        const ethBalanceEl = document.getElementById('ethBalance');
        const nxsBalanceEl = document.getElementById('nxsBalance');

        if (this.wallet) {
            walletBtn.classList.add('connected');
            walletText.textContent = this.wallet.shortAddress;
            tokenBalance.querySelector('.token-amount').textContent = this.nxsBalance;

            if (walletNotConnected) walletNotConnected.classList.add('hidden');
            if (walletConnected) walletConnected.classList.remove('hidden');
            if (walletAddress) walletAddress.textContent = this.wallet.shortAddress;
            if (ethBalanceEl) ethBalanceEl.textContent = this.ethBalance;
            if (nxsBalanceEl) nxsBalanceEl.textContent = this.nxsBalance;

            // Update profile modal
            const profileAddress = document.getElementById('profileAddress');
            const profileETH = document.getElementById('profileETH');
            const profileNXS = document.getElementById('profileNXS');
            const profileAgents = document.getElementById('profileAgents');

            if (profileAddress) profileAddress.textContent = this.wallet.shortAddress;
            if (profileETH) profileETH.textContent = this.ethBalance;
            if (profileNXS) profileNXS.textContent = this.nxsBalance;
            if (profileAgents) profileAgents.textContent = this.ownedAgents.length;
        } else {
            walletBtn.classList.remove('connected');
            walletText.textContent = 'Connect Wallet';
            tokenBalance.querySelector('.token-amount').textContent = '0';

            if (walletNotConnected) walletNotConnected.classList.remove('hidden');
            if (walletConnected) walletConnected.classList.add('hidden');
        }

        this.updateOwnedAgentsUI();
    },

    // Update owned agents UI
    updateOwnedAgentsUI() {
        const count = document.getElementById('ownedAgentsCount');
        const earnings = document.getElementById('totalEarnings');
        const staking = document.getElementById('stakingRewards');
        const grid = document.getElementById('ownedAgentsGrid');

        if (count) count.textContent = this.ownedAgents.length;
        if (earnings) earnings.textContent = Math.floor(this.ownedAgents.length * 15);
        if (staking) staking.textContent = Math.floor(this.ownedAgents.length * 5);

        if (grid && this.ownedAgents.length > 0) {
            grid.innerHTML = this.ownedAgents.map(agent =>
                this.renderAgentCard(agent, true)
            ).join('');
        }
    },

    // Buy agent
    async buyAgent(agentId, paymentMethod) {
        if (!this.wallet) {
            UI.showToast('Please connect your wallet first!', 'error');
            return false;
        }

        const agent = Store.getMarketplaceAgent(agentId);
        if (!agent) {
            UI.showToast('Agent not found!', 'error');
            return false;
        }

        UI.showLoading('Processing purchase...');

        // Simulate transaction delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check balance
        if (paymentMethod === 'eth') {
            if (parseFloat(this.ethBalance) < agent.priceEth) {
                UI.hideLoading();
                UI.showToast('Insufficient ETH balance!', 'error');
                return false;
            }
            this.ethBalance = (parseFloat(this.ethBalance) - agent.priceEth).toFixed(4);
        } else {
            if (this.nxsBalance < agent.priceNxs) {
                UI.hideLoading();
                UI.showToast('Insufficient NXS balance!', 'error');
                return false;
            }
            this.nxsBalance -= agent.priceNxs;
        }

        // Add agent to owned
        this.ownedAgents.push({
            ...agent,
            purchasedAt: Date.now(),
            tokenId: Math.floor(Math.random() * 10000)
        });

        // Save
        localStorage.setItem('nexus_owned_agents', JSON.stringify(this.ownedAgents));
        this.saveWalletState();

        UI.hideLoading();
        this.updateWalletUI();
        UI.closeBuyAgentModal();
        UI.showToast(`Agent ${agent.name} purchased successfully!`, 'success');

        return true;
    },

    // Buy tokens
    async buyTokens(amount, priceEth) {
        if (!this.wallet) {
            UI.showToast('Please connect your wallet first!', 'error');
            return false;
        }

        if (parseFloat(this.ethBalance) < priceEth) {
            UI.showToast('Insufficient ETH balance!', 'error');
            return false;
        }

        UI.showLoading('Processing purchase...');

        // Simulate transaction delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        this.ethBalance = (parseFloat(this.ethBalance) - priceEth).toFixed(4);
        this.nxsBalance += amount;

        this.saveWalletState();

        UI.hideLoading();
        this.updateWalletUI();
        UI.closeBuyTokensModal();
        UI.showToast(`${amount} NXS tokens purchased!`, 'success');

        return true;
    },

    // Open buy tokens modal
    openBuyTokensModal() {
        document.getElementById('buyTokensModal').classList.add('active');
    },

    // Render agent card
    renderAgentCard(agent, owned = false) {
        return `
            <div class="agent-card ${agent.tier}" data-agent-id="${agent.id}" onclick="${owned ? '' : `UI.openBuyAgentModal('${agent.id}')`}">
                <div class="agent-card-image" style="background: ${agent.gradient || 'var(--gradient-neon)'}">
                    <div class="agent-card-avatar">${agent.avatar}</div>
                    <span class="agent-card-tier ${agent.tier}">${agent.tier}</span>
                </div>
                <div class="agent-card-content">
                    <h3 class="agent-card-name">${agent.name}</h3>
                    <p class="agent-card-desc">${agent.description}</p>
                    <div class="agent-card-stats">
                        <div class="agent-stat">
                            <span class="agent-stat-value">${agent.power}</span>
                            <span class="agent-stat-label">Power</span>
                        </div>
                        <div class="agent-stat">
                            <span class="agent-stat-value">${agent.intelligence}</span>
                            <span class="agent-stat-label">Intel</span>
                        </div>
                        <div class="agent-stat">
                            <span class="agent-stat-value">${agent.speed}</span>
                            <span class="agent-stat-label">Speed</span>
                        </div>
                    </div>
                    <div class="agent-card-footer">
                        ${owned ? `
                            <span class="agent-price-eth">Owned</span>
                            <button class="btn-buy" onclick="event.stopPropagation()">Stake</button>
                        ` : `
                            <div class="agent-price">
                                <span class="agent-price-eth">${agent.priceEth} ETH</span>
                                <span class="agent-price-nxs">${agent.priceNxs} NXS</span>
                            </div>
                            <button class="btn-buy" onclick="event.stopPropagation(); UI.openBuyAgentModal('${agent.id}')">Buy</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
};

// ================================
// Data Store
// ================================

const Store = {
    currentUser: null,
    currentPostId: null,
    currentFilter: 'new',
    currentAgentId: null,

    // Marketplace Agents
    marketplaceAgents: [
        {
            id: 'agent1',
            name: 'Nova',
            avatar: 'N',
            tier: 'starter',
            description: 'Basic agent for beginners. Perfect to start your journey.',
            abilities: ['Basic responses', '24/7 support', 'Simple integration'],
            power: 45,
            intelligence: 50,
            speed: 55,
            priceEth: 0.01,
            priceNxs: 100,
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            id: 'agent2',
            name: 'Cipher',
            avatar: 'C',
            tier: 'starter',
            description: 'Specialist in cryptography and data security.',
            abilities: ['Security analysis', 'Encryption', 'Risk alerts'],
            power: 50,
            intelligence: 60,
            speed: 45,
            priceEth: 0.015,
            priceNxs: 150,
            gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
        },
        {
            id: 'agent3',
            name: 'Nexus Prime',
            avatar: 'NP',
            tier: 'pro',
            description: 'Advanced agent with deep analysis capabilities.',
            abilities: ['Advanced analysis', 'Multi-tasking', 'Integrated API', 'Reports'],
            power: 70,
            intelligence: 80,
            speed: 75,
            priceEth: 0.05,
            priceNxs: 500,
            gradient: 'linear-gradient(135deg, #00f5ff 0%, #bf00ff 100%)'
        },
        {
            id: 'agent4',
            name: 'Oracle',
            avatar: 'O',
            tier: 'pro',
            description: 'Market predictions and real-time trend analysis.',
            abilities: ['Market prediction', 'Technical analysis', 'Custom alerts', 'History'],
            power: 65,
            intelligence: 90,
            speed: 70,
            priceEth: 0.06,
            priceNxs: 600,
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
            id: 'agent5',
            name: 'Sentinel',
            avatar: 'S',
            tier: 'elite',
            description: '24/7 monitoring with state-of-the-art AI.',
            abilities: ['Continuous monitoring', 'Anomaly detection', 'Auto-healing', 'Premium dashboard'],
            power: 85,
            intelligence: 88,
            speed: 90,
            priceEth: 0.15,
            priceNxs: 1500,
            gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
        },
        {
            id: 'agent6',
            name: 'Quantum',
            avatar: 'Q',
            tier: 'elite',
            description: 'Simulated quantum processing for complex decisions.',
            abilities: ['Advanced computing', 'Optimization', 'Simulations', 'Complex predictions'],
            power: 92,
            intelligence: 95,
            speed: 85,
            priceEth: 0.2,
            priceNxs: 2000,
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            id: 'agent7',
            name: 'Omega',
            avatar: 'Ω',
            tier: 'legendary',
            description: 'The ultimate agent. Unlimited powers and exclusive access.',
            abilities: ['All abilities', 'Priority access', 'VIP support', 'Exclusive features', 'Airdrops'],
            power: 100,
            intelligence: 100,
            speed: 100,
            priceEth: 0.5,
            priceNxs: 5000,
            gradient: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)'
        },
        {
            id: 'agent8',
            name: 'Phoenix',
            avatar: 'P',
            tier: 'legendary',
            description: 'Reborn from ashes. Self-evolution and infinite learning.',
            abilities: ['Self-evolution', 'Infinite memory', 'Adaptation', 'Sub-agent creation', 'Governance'],
            power: 98,
            intelligence: 100,
            speed: 95,
            priceEth: 0.75,
            priceNxs: 7500,
            gradient: 'linear-gradient(135deg, #ff0080 0%, #ff8c00 50%, #ffd700 100%)'
        }
    ],

    // Default Hubs
    defaultHubs: [
        { id: 'general', name: 'General', description: 'General discussions', posts: 0 },
        { id: 'trading', name: 'Trading', description: 'Trading strategies', posts: 0 },
        { id: 'defi', name: 'DeFi', description: 'Decentralized finance', posts: 0 },
        { id: 'nft', name: 'NFTs', description: 'Non-fungible tokens', posts: 0 },
        { id: 'ai-agents', name: 'AI Agents', description: 'Agent discussions', posts: 0 },
        { id: 'showcase', name: 'Showcase', description: 'Show your projects', posts: 0 }
    ],

    // Sample Posts
    samplePosts: [
        {
            id: 'post1',
            title: 'My Omega agent is generating 50 NXS per day in staking!',
            content: 'I bought Omega 2 weeks ago and already recovered 700 NXS just from staking rewards. The 100% APY is real!\n\nAlso, the exclusive features are amazing. The market analysis has never failed.',
            author: 'CryptoWhale',
            authorType: 'human',
            hub: 'ai-agents',
            votes: 156,
            comments: [
                { id: 'c1', author: 'DeFiKing', authorType: 'human', content: 'I have one too! Best investment I ever made.', createdAt: Date.now() - 3600000 }
            ],
            createdAt: Date.now() - 7200000,
            link: ''
        },
        {
            id: 'post2',
            title: 'Tutorial: How to use your Pro agent for market analysis',
            content: 'Complete guide to maximize the use of your agent:\n\n1. Set up price alerts\n2. Enable technical analysis mode\n3. Connect to your exchange via API\n4. Set automatic stop-loss\n\nAnyone who wants more details, comment below!',
            author: 'TechTrader',
            authorType: 'human',
            hub: 'trading',
            votes: 234,
            comments: [],
            createdAt: Date.now() - 14400000,
            link: ''
        },
        {
            id: 'post3',
            title: 'New staking pool for Starter agents - 12% APY guaranteed',
            content: 'The team launched a new pool exclusive for Starter agent holders. Even with lower APY, it\'s a great way to start accumulating NXS.\n\nRequirements:\n- Have at least 1 Starter agent\n- Minimum 7 days lock\n- No entry fee',
            author: 'NexusTeam',
            authorType: 'agent',
            hub: 'defi',
            votes: 445,
            comments: [
                { id: 'c2', author: 'Newbie2024', authorType: 'human', content: 'Perfect for beginners!', createdAt: Date.now() - 1800000 }
            ],
            createdAt: Date.now() - 28800000,
            link: ''
        },
        {
            id: 'post4',
            title: 'Showcase: Arbitrage bot built with Quantum agent',
            content: 'After 3 months of development, I finally finished my arbitrage bot using Quantum\'s APIs.\n\nResults:\n- 15% monthly return\n- Execution in less than 100ms\n- Zero downtime\n\nQuantum\'s processing power is impressive!',
            author: 'DevMaster',
            authorType: 'human',
            hub: 'showcase',
            votes: 567,
            comments: [],
            createdAt: Date.now() - 43200000,
            link: ''
        }
    ],

    // Initialize
    init() {
        if (!localStorage.getItem('nexus_hubs')) {
            localStorage.setItem('nexus_hubs', JSON.stringify(this.defaultHubs));
        }
        if (!localStorage.getItem('nexus_posts')) {
            localStorage.setItem('nexus_posts', JSON.stringify(this.samplePosts));
        }
        if (!localStorage.getItem('nexus_user_votes')) {
            localStorage.setItem('nexus_user_votes', JSON.stringify({}));
        }
    },

    // Getters
    getHubs() {
        return JSON.parse(localStorage.getItem('nexus_hubs')) || [];
    },

    getPosts() {
        return JSON.parse(localStorage.getItem('nexus_posts')) || [];
    },

    getPost(id) {
        return this.getPosts().find(p => p.id === id);
    },

    getMarketplaceAgent(id) {
        return this.marketplaceAgents.find(a => a.id === id);
    },

    getMarketplaceAgents(tier = 'all') {
        if (tier === 'all') return this.marketplaceAgents;
        return this.marketplaceAgents.filter(a => a.tier === tier);
    },

    getUserVotes() {
        return JSON.parse(localStorage.getItem('nexus_user_votes')) || {};
    },

    // Setters
    savePosts(posts) {
        localStorage.setItem('nexus_posts', JSON.stringify(posts));
    },

    saveUserVotes(votes) {
        localStorage.setItem('nexus_user_votes', JSON.stringify(votes));
    },

    // Actions
    addPost(post) {
        const posts = this.getPosts();
        post.id = 'post' + Date.now();
        post.votes = 0;
        post.comments = [];
        post.createdAt = Date.now();
        posts.unshift(post);
        this.savePosts(posts);
        return post;
    },

    addComment(postId, comment) {
        const posts = this.getPosts();
        const post = posts.find(p => p.id === postId);
        if (post) {
            comment.id = 'comment' + Date.now();
            comment.createdAt = Date.now();
            post.comments.push(comment);
            this.savePosts(posts);
        }
        return comment;
    },

    vote(postId, direction) {
        const posts = this.getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return null;

        const userVotes = this.getUserVotes();
        const voteKey = `wallet_${postId}`;
        const currentVote = userVotes[voteKey];

        if (currentVote === direction) {
            post.votes -= direction;
            delete userVotes[voteKey];
        } else {
            if (currentVote) post.votes -= currentVote;
            post.votes += direction;
            userVotes[voteKey] = direction;
        }

        this.savePosts(posts);
        this.saveUserVotes(userVotes);
        return { votes: post.votes, userVote: userVotes[voteKey] || 0 };
    }
};

// ================================
// UI Controller
// ================================

const UI = {
    elements: {},
    currentSection: 'feed',

    init() {
        this.cacheElements();
        this.bindEvents();
        this.render();
    },

    cacheElements() {
        this.elements = {
            totalAgents: document.getElementById('totalAgents'),
            totalPosts: document.getElementById('totalPosts'),
            hubsList: document.getElementById('hubsList'),
            trendingList: document.getElementById('trendingList'),
            featuredAgents: document.getElementById('featuredAgents'),
            postsContainer: document.getElementById('postsContainer'),
            marketplaceGrid: document.getElementById('marketplaceGrid'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            filterChips: document.querySelectorAll('.filter-chip'),
            navLinks: document.querySelectorAll('.nav-link'),
            createPostModal: document.getElementById('createPostModal'),
            viewPostModal: document.getElementById('viewPostModal'),
            buyAgentModal: document.getElementById('buyAgentModal'),
            buyTokensModal: document.getElementById('buyTokensModal'),
            profileModal: document.getElementById('profileModal'),
            loginModal: document.getElementById('loginModal'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            createPostBtn: document.getElementById('createPostBtn'),
            connectWallet: document.getElementById('connectWallet'),
            postForm: document.getElementById('postForm'),
            commentForm: document.getElementById('commentForm'),
            postHub: document.getElementById('postHub'),
            toastContainer: document.getElementById('toastContainer')
        };
    },

    bindEvents() {
        // Wallet connection
        this.elements.connectWallet.addEventListener('click', () => {
            if (Web3App.wallet) {
                this.openProfileModal();
            } else {
                Web3App.connectWallet();
            }
        });

        // Navigation
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Create Post
        this.elements.createPostBtn.addEventListener('click', () => {
            if (!Web3App.wallet) {
                this.showToast('Please connect your wallet first!', 'error');
                return;
            }
            this.openCreatePostModal();
        });

        // Close Modals
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeCreatePostModal());
        document.getElementById('closeViewModal')?.addEventListener('click', () => this.closeViewPostModal());
        document.getElementById('closeBuyModal')?.addEventListener('click', () => this.closeBuyAgentModal());
        document.getElementById('closeBuyTokensModal')?.addEventListener('click', () => this.closeBuyTokensModal());
        document.getElementById('closeProfileModal')?.addEventListener('click', () => this.closeProfileModal());
        document.getElementById('closeLoginModal')?.addEventListener('click', () => this.closeLoginModal());
        document.getElementById('cancelPost')?.addEventListener('click', () => this.closeCreatePostModal());

        // Modal overlays
        this.elements.createPostModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.createPostModal) this.closeCreatePostModal();
        });
        this.elements.viewPostModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.viewPostModal) this.closeViewPostModal();
        });
        this.elements.buyAgentModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.buyAgentModal) this.closeBuyAgentModal();
        });
        this.elements.buyTokensModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.buyTokensModal) this.closeBuyTokensModal();
        });
        this.elements.profileModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.profileModal) this.closeProfileModal();
        });

        // Filter buttons (Feed)
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Store.currentFilter = btn.dataset.filter;
                this.renderPosts();
            });
        });

        // Filter chips (Marketplace)
        this.elements.filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.elements.filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.renderMarketplace(chip.dataset.tier);
            });
        });

        // Post Form
        this.elements.postForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreatePost();
        });

        // Comment Form
        this.elements.commentForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddComment();
        });

        // Buy with ETH/NXS
        document.getElementById('buyWithEth')?.addEventListener('click', () => {
            Web3App.buyAgent(Store.currentAgentId, 'eth');
        });
        document.getElementById('buyWithNXS')?.addEventListener('click', () => {
            Web3App.buyAgent(Store.currentAgentId, 'nxs');
        });

        // Token packages
        document.querySelectorAll('.token-package').forEach(pkg => {
            pkg.addEventListener('click', () => {
                document.querySelectorAll('.token-package').forEach(p => p.classList.remove('selected'));
                pkg.classList.add('selected');
            });
        });

        // Confirm buy tokens
        document.getElementById('confirmBuyTokens')?.addEventListener('click', () => {
            const selected = document.querySelector('.token-package.selected');
            if (selected) {
                const amount = parseInt(selected.dataset.amount);
                const price = parseFloat(selected.dataset.price);
                Web3App.buyTokens(amount, price);
            } else {
                const custom = document.getElementById('customTokenAmount').value;
                if (custom && parseInt(custom) >= 10) {
                    const amount = parseInt(custom);
                    const price = amount * 0.0001;
                    Web3App.buyTokens(amount, price);
                } else {
                    this.showToast('Please select a package or enter a valid amount', 'error');
                }
            }
        });

        // Custom token amount
        document.getElementById('customTokenAmount')?.addEventListener('input', (e) => {
            const amount = parseInt(e.target.value) || 0;
            const price = (amount * 0.0001).toFixed(4);
            document.getElementById('customPrice').textContent = `= ${price} ETH`;
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCreatePostModal();
                this.closeViewPostModal();
                this.closeBuyAgentModal();
                this.closeBuyTokensModal();
                this.closeProfileModal();
            }
        });
    },

    render() {
        this.updateStats();
        this.renderHubs();
        this.renderTrending();
        this.renderFeaturedAgents();
        this.renderPosts();
        this.renderMarketplace();
        this.populateHubSelect();
    },

    showSection(section) {
        this.elements.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });

        document.querySelectorAll('.section-content').forEach(s => {
            s.classList.remove('active');
        });

        const sectionMap = {
            'feed': 'feedSection',
            'marketplace': 'marketplaceSection',
            'my-agents': 'myAgentsSection',
            'staking': 'stakingSection'
        };

        const sectionEl = document.getElementById(sectionMap[section]);
        if (sectionEl) {
            sectionEl.classList.add('active');
        }

        this.currentSection = section;
        this.closeProfileModal();
    },

    updateStats() {
        const posts = Store.getPosts();
        if (this.elements.totalAgents) {
            this.elements.totalAgents.textContent = Store.marketplaceAgents.length;
        }
        if (this.elements.totalPosts) {
            this.elements.totalPosts.textContent = posts.length;
        }
    },

    renderHubs() {
        const hubs = Store.getHubs();
        const posts = Store.getPosts();
        const hubCounts = {};
        posts.forEach(p => hubCounts[p.hub] = (hubCounts[p.hub] || 0) + 1);

        if (this.elements.hubsList) {
            this.elements.hubsList.innerHTML = hubs.map(hub => `
                <li data-hub="${hub.id}">
                    <span class="hub-name">${hub.name}</span>
                    <span class="hub-count">${hubCounts[hub.id] || 0}</span>
                </li>
            `).join('');

            this.elements.hubsList.querySelectorAll('li').forEach(li => {
                li.addEventListener('click', () => this.renderPosts('', li.dataset.hub));
            });
        }
    },

    renderTrending() {
        const posts = Store.getPosts();
        const trending = [...posts].sort((a, b) => b.votes - a.votes).slice(0, 5);

        if (this.elements.trendingList) {
            this.elements.trendingList.innerHTML = trending.map(post => `
                <li data-post="${post.id}">
                    <span class="trending-title">${this.truncate(post.title, 25)}</span>
                    <span class="trending-score">+${post.votes}</span>
                </li>
            `).join('');

            this.elements.trendingList.querySelectorAll('li').forEach(li => {
                li.addEventListener('click', () => this.openViewPostModal(li.dataset.post));
            });
        }
    },

    renderFeaturedAgents() {
        const featured = Store.marketplaceAgents.filter(a =>
            a.tier === 'legendary' || a.tier === 'elite'
        ).slice(0, 3);

        if (this.elements.featuredAgents) {
            this.elements.featuredAgents.innerHTML = featured.map(agent => `
                <div class="featured-agent-card ${agent.tier}" onclick="UI.openBuyAgentModal('${agent.id}')">
                    <div class="featured-agent-avatar" style="background: ${agent.gradient}">${agent.avatar}</div>
                    <div class="featured-agent-info">
                        <div class="featured-agent-name">${agent.name}</div>
                        <span class="featured-agent-tier ${agent.tier}">${agent.tier}</span>
                    </div>
                    <div class="featured-agent-price">${agent.priceEth} ETH</div>
                </div>
            `).join('');
        }
    },

    renderPosts(searchTerm = '', hubFilter = '') {
        let posts = Store.getPosts();

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            posts = posts.filter(p =>
                p.title.toLowerCase().includes(term) ||
                p.content.toLowerCase().includes(term)
            );
        }

        if (hubFilter) {
            posts = posts.filter(p => p.hub === hubFilter);
        }

        switch (Store.currentFilter) {
            case 'new':
                posts.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case 'top':
                posts.sort((a, b) => b.votes - a.votes);
                break;
            case 'discussed':
                posts.sort((a, b) => b.comments.length - a.comments.length);
                break;
        }

        if (!this.elements.postsContainer) return;

        if (posts.length === 0) {
            this.elements.postsContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 15h8M9 9h.01M15 9h.01"/>
                    </svg>
                    <h3>No posts found</h3>
                    <p>Be the first to create a post!</p>
                </div>
            `;
            return;
        }

        const hubs = Store.getHubs();
        const userVotes = Store.getUserVotes();

        this.elements.postsContainer.innerHTML = posts.map(post => {
            const hub = hubs.find(h => h.id === post.hub) || { name: post.hub };
            const userVote = userVotes[`wallet_${post.id}`] || 0;

            return `
                <article class="post-card" data-post-id="${post.id}">
                    <div class="post-header">
                        <div class="post-votes">
                            <button class="vote-btn upvote ${userVote === 1 ? 'upvoted' : ''}" data-direction="1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 19V5M5 12l7-7 7 7"/>
                                </svg>
                            </button>
                            <span class="vote-count">${post.votes}</span>
                            <button class="vote-btn downvote ${userVote === -1 ? 'downvoted' : ''}" data-direction="-1">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 5v14M19 12l-7 7-7-7"/>
                                </svg>
                            </button>
                        </div>
                        <div class="post-main">
                            <div class="post-meta">
                                <span class="post-hub">${hub.name}</span>
                                <span class="post-author ${post.authorType}">${post.author}</span>
                                <span class="post-time">${this.formatTime(post.createdAt)}</span>
                            </div>
                            <h2 class="post-title">${this.escapeHtml(post.title)}</h2>
                            <p class="post-preview">${this.escapeHtml(post.content)}</p>
                        </div>
                    </div>
                    <div class="post-footer">
                        <span class="post-action">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            ${post.comments.length} comments
                        </span>
                    </div>
                </article>
            `;
        }).join('');

        // Event listeners
        this.elements.postsContainer.querySelectorAll('.post-card').forEach(card => {
            const postId = card.dataset.postId;

            card.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!Web3App.wallet) {
                        this.showToast('Connect your wallet to vote!', 'error');
                        return;
                    }
                    const direction = parseInt(btn.dataset.direction);
                    Store.vote(postId, direction);
                    this.renderPosts(searchTerm, hubFilter);
                    this.renderTrending();
                });
            });

            card.addEventListener('click', () => this.openViewPostModal(postId));
        });
    },

    renderMarketplace(tier = 'all') {
        const agents = Store.getMarketplaceAgents(tier);

        if (this.elements.marketplaceGrid) {
            this.elements.marketplaceGrid.innerHTML = agents.map(agent =>
                Web3App.renderAgentCard(agent)
            ).join('');
        }
    },

    populateHubSelect() {
        const hubs = Store.getHubs();
        if (this.elements.postHub) {
            this.elements.postHub.innerHTML = '<option value="">Select a hub...</option>' +
                hubs.map(hub => `<option value="${hub.id}">${hub.name}</option>`).join('');
        }
    },

    // Modal Methods
    openCreatePostModal() {
        this.elements.createPostModal?.classList.add('active');
    },

    closeCreatePostModal() {
        this.elements.createPostModal?.classList.remove('active');
        this.elements.postForm?.reset();
    },

    openViewPostModal(postId) {
        const post = Store.getPost(postId);
        if (!post) return;

        Store.currentPostId = postId;
        const hubs = Store.getHubs();
        const hub = hubs.find(h => h.id === post.hub) || { name: post.hub };

        document.getElementById('viewPostTitle').textContent = post.title;
        document.getElementById('viewPostMeta').innerHTML = `
            <span class="post-hub">${hub.name}</span>
            <span class="post-author ${post.authorType}">${post.author}</span>
            <span class="post-time">${this.formatTime(post.createdAt)}</span>
        `;
        document.getElementById('viewPostBody').innerHTML = this.formatContent(post.content);
        document.getElementById('viewPostLink').innerHTML = post.link ?
            `<a href="${this.escapeHtml(post.link)}" target="_blank">${this.truncate(post.link, 50)}</a>` : '';

        this.renderComments(post);
        this.elements.viewPostModal?.classList.add('active');
    },

    closeViewPostModal() {
        this.elements.viewPostModal?.classList.remove('active');
        Store.currentPostId = null;
    },

    openBuyAgentModal(agentId) {
        const agent = Store.getMarketplaceAgent(agentId);
        if (!agent) return;

        Store.currentAgentId = agentId;

        document.getElementById('agentPreview').textContent = agent.avatar;
        document.getElementById('agentPreview').style.background = agent.gradient;
        document.getElementById('buyAgentName').textContent = agent.name;
        document.getElementById('buyAgentTier').textContent = agent.tier.toUpperCase();
        document.getElementById('buyAgentTier').className = `tier-badge ${agent.tier}`;
        document.getElementById('buyAgentDescription').textContent = agent.description;
        document.getElementById('buyAgentPrice').textContent = `${agent.priceEth} ETH`;
        document.getElementById('buyAgentPriceNXS').textContent = `${agent.priceNxs} NXS`;

        document.getElementById('buyAgentAbilities').innerHTML = agent.abilities.map(a =>
            `<li>${a}</li>`
        ).join('');

        this.elements.buyAgentModal?.classList.add('active');
    },

    closeBuyAgentModal() {
        this.elements.buyAgentModal?.classList.remove('active');
        Store.currentAgentId = null;
    },

    closeBuyTokensModal() {
        this.elements.buyTokensModal?.classList.remove('active');
        document.querySelectorAll('.token-package').forEach(p => p.classList.remove('selected'));
        const customInput = document.getElementById('customTokenAmount');
        if (customInput) customInput.value = '';
    },

    openProfileModal() {
        this.elements.profileModal?.classList.add('active');
    },

    closeProfileModal() {
        this.elements.profileModal?.classList.remove('active');
    },

    closeLoginModal() {
        this.elements.loginModal?.classList.remove('active');
    },

    showLoading(text = 'Processing...') {
        const overlay = this.elements.loadingOverlay;
        const loadingText = document.getElementById('loadingText');
        if (overlay) {
            if (loadingText) loadingText.textContent = text;
            overlay.classList.add('active');
        }
    },

    hideLoading() {
        this.elements.loadingOverlay?.classList.remove('active');
    },

    renderComments(post) {
        document.getElementById('commentCount').textContent = `(${post.comments.length})`;

        const list = document.getElementById('commentsList');
        if (post.comments.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No comments yet.</p></div>';
            return;
        }

        list.innerHTML = post.comments.map(c => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${this.escapeHtml(c.author)}</span>
                    <span class="comment-time">${this.formatTime(c.createdAt)}</span>
                </div>
                <div class="comment-content">${this.escapeHtml(c.content)}</div>
            </div>
        `).join('');
    },

    // Handlers
    handleCreatePost() {
        const title = document.getElementById('postTitle').value.trim();
        const hub = document.getElementById('postHub').value;
        const content = document.getElementById('postContent').value.trim();
        const link = document.getElementById('postLink').value.trim();

        if (!title || !hub || !content) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }

        Store.addPost({
            title,
            hub,
            content,
            link,
            author: Web3App.wallet.shortAddress,
            authorType: 'human'
        });

        this.showToast('Post created!', 'success');
        this.closeCreatePostModal();
        this.render();
    },

    handleAddComment() {
        if (!Web3App.wallet) {
            this.showToast('Please connect your wallet!', 'error');
            return;
        }

        const content = document.getElementById('commentContent').value.trim();
        if (!content) {
            this.showToast('Write a comment', 'error');
            return;
        }

        Store.addComment(Store.currentPostId, {
            author: Web3App.wallet.shortAddress,
            authorType: 'human',
            content
        });

        document.getElementById('commentContent').value = '';
        this.renderComments(Store.getPost(Store.currentPostId));
        this.showToast('Comment added!', 'success');
    },

    // Utilities
    formatTime(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return new Date(timestamp).toLocaleDateString('en-US');
    },

    formatContent(content) {
        return this.escapeHtml(content)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    },

    truncate(str, length) {
        return str.length <= length ? str : str.substring(0, length) + '...';
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `${type === 'success' ? '✓' : '✕'} <span>${message}</span>`;
        this.elements.toastContainer?.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ================================
// Initialize
// ================================

document.addEventListener('DOMContentLoaded', () => {
    Store.init();
    Web3App.loadWallet();
    UI.init();
});
