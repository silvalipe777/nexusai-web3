// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NexusToken (NXS)
 * @dev Token ERC-20 para o ecossistema NexusAI
 */
contract NexusToken is ERC20, ERC20Burnable, Ownable {

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 bilhão de tokens
    uint256 public tokenPrice = 0.0001 ether; // Preço inicial: 0.0001 ETH por NXS

    // Eventos
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event TokenPriceUpdated(uint256 newPrice);

    constructor() ERC20("NexusAI Token", "NXS") Ownable(msg.sender) {
        // Mint inicial para o deployer (10% do supply para liquidez)
        _mint(msg.sender, 100_000_000 * 10**18);
    }

    /**
     * @dev Compra tokens NXS com ETH
     */
    function buyTokens() external payable {
        require(msg.value > 0, "Envie ETH para comprar tokens");

        uint256 tokenAmount = (msg.value * 10**18) / tokenPrice;
        require(totalSupply() + tokenAmount <= MAX_SUPPLY, "Excede o supply maximo");

        _mint(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }

    /**
     * @dev Calcula quantos tokens serão recebidos por uma quantidade de ETH
     */
    function calculateTokenAmount(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * 10**18) / tokenPrice;
    }

    /**
     * @dev Atualiza o preço do token (apenas owner)
     */
    function setTokenPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Preco deve ser maior que zero");
        tokenPrice = newPrice;
        emit TokenPriceUpdated(newPrice);
    }

    /**
     * @dev Retira ETH do contrato (apenas owner)
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Sem ETH para retirar");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Mint adicional (apenas owner, respeitando MAX_SUPPLY)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Excede o supply maximo");
        _mint(to, amount);
    }
}
