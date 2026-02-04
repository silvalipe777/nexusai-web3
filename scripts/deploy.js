const hre = require("hardhat");

async function main() {
  console.log("Iniciando deploy dos contratos ThreadSTR...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 1. Deploy ThreadSTRToken (TSTR)
  console.log("\n1. Deploying ThreadSTRToken (TSTR)...");
  const ThreadSTRToken = await hre.ethers.getContractFactory("ThreadSTRToken");
  const threadToken = await ThreadSTRToken.deploy();
  await threadToken.waitForDeployment();
  const tokenAddress = await threadToken.getAddress();
  console.log("   ThreadSTRToken deployed to:", tokenAddress);

  // 2. Deploy ThreadSTRAgents (NFT)
  console.log("\n2. Deploying ThreadSTRAgents (NFT)...");
  const ThreadSTRAgents = await hre.ethers.getContractFactory("ThreadSTRAgents");
  const threadAgents = await ThreadSTRAgents.deploy(tokenAddress);
  await threadAgents.waitForDeployment();
  const agentsAddress = await threadAgents.getAddress();
  console.log("   ThreadSTRAgents deployed to:", agentsAddress);

  // 3. Deploy ThreadSTRStaking
  console.log("\n3. Deploying ThreadSTRStaking...");
  const ThreadSTRStaking = await hre.ethers.getContractFactory("ThreadSTRStaking");
  const threadStaking = await ThreadSTRStaking.deploy(tokenAddress, agentsAddress);
  await threadStaking.waitForDeployment();
  const stakingAddress = await threadStaking.getAddress();
  console.log("   ThreadSTRStaking deployed to:", stakingAddress);

  // 4. Configurar pool de recompensas
  console.log("\n4. Funding reward pool...");
  const fundAmount = hre.ethers.parseEther("10000000"); // 10M TSTR para pool
  await threadToken.approve(stakingAddress, fundAmount);
  await threadStaking.fundRewardPool(fundAmount);
  console.log("   Reward pool funded with 10,000,000 TSTR");

  // Resumo
  console.log("\n" + "=".repeat(50));
  console.log("DEPLOY COMPLETO!");
  console.log("=".repeat(50));
  console.log("\nEndereços dos contratos:");
  console.log("-".repeat(50));
  console.log("ThreadSTRToken (TSTR):", tokenAddress);
  console.log("ThreadSTRAgents (NFT):", agentsAddress);
  console.log("ThreadSTRStaking:", stakingAddress);
  console.log("-".repeat(50));

  // Salvar endereços em arquivo
  const fs = require("fs");
  const addresses = {
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      ThreadSTRToken: tokenAddress,
      ThreadSTRAgents: agentsAddress,
      ThreadSTRStaking: stakingAddress
    }
  };

  fs.writeFileSync(
    "./deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nEndereços salvos em deployed-addresses.json");

  // Verificar contratos no Basescan (se não for localhost)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nVerificando contratos no Basescan...");

    // Aguarda alguns blocos antes de verificar
    console.log("Aguardando confirmações...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: []
      });
      console.log("ThreadSTRToken verificado!");

      await hre.run("verify:verify", {
        address: agentsAddress,
        constructorArguments: [tokenAddress]
      });
      console.log("ThreadSTRAgents verificado!");

      await hre.run("verify:verify", {
        address: stakingAddress,
        constructorArguments: [tokenAddress, agentsAddress]
      });
      console.log("ThreadSTRStaking verificado!");
    } catch (error) {
      console.log("Erro na verificação:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
