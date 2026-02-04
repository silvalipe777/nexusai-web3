const hre = require("hardhat");

async function main() {
  console.log("Iniciando deploy dos contratos ThreadSTR...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 1. Deploy NexusToken (NXS)
  console.log("\n1. Deploying NexusToken (NXS)...");
  const NexusToken = await hre.ethers.getContractFactory("NexusToken");
  const nexusToken = await NexusToken.deploy();
  await nexusToken.waitForDeployment();
  const tokenAddress = await nexusToken.getAddress();
  console.log("   NexusToken deployed to:", tokenAddress);

  // 2. Deploy NexusAgents (NFT)
  console.log("\n2. Deploying NexusAgents (NFT)...");
  const NexusAgents = await hre.ethers.getContractFactory("NexusAgents");
  const nexusAgents = await NexusAgents.deploy(tokenAddress);
  await nexusAgents.waitForDeployment();
  const agentsAddress = await nexusAgents.getAddress();
  console.log("   NexusAgents deployed to:", agentsAddress);

  // 3. Deploy NexusStaking
  console.log("\n3. Deploying NexusStaking...");
  const NexusStaking = await hre.ethers.getContractFactory("NexusStaking");
  const nexusStaking = await NexusStaking.deploy(tokenAddress, agentsAddress);
  await nexusStaking.waitForDeployment();
  const stakingAddress = await nexusStaking.getAddress();
  console.log("   NexusStaking deployed to:", stakingAddress);

  // 4. Configurar pool de recompensas
  console.log("\n4. Funding reward pool...");
  const fundAmount = hre.ethers.parseEther("10000000"); // 10M NXS para pool
  await nexusToken.approve(stakingAddress, fundAmount);
  await nexusStaking.fundRewardPool(fundAmount);
  console.log("   Reward pool funded with 10,000,000 NXS");

  // Resumo
  console.log("\n" + "=".repeat(50));
  console.log("DEPLOY COMPLETO!");
  console.log("=".repeat(50));
  console.log("\nEndereços dos contratos:");
  console.log("-".repeat(50));
  console.log("NexusToken (NXS):", tokenAddress);
  console.log("NexusAgents (NFT):", agentsAddress);
  console.log("NexusStaking:", stakingAddress);
  console.log("-".repeat(50));

  // Salvar endereços em arquivo
  const fs = require("fs");
  const addresses = {
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      NexusToken: tokenAddress,
      NexusAgents: agentsAddress,
      NexusStaking: stakingAddress
    }
  };

  fs.writeFileSync(
    "./deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nEndereços salvos em deployed-addresses.json");

  // Verificar contratos no Etherscan (se não for localhost)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nVerificando contratos no Etherscan...");

    // Aguarda alguns blocos antes de verificar
    console.log("Aguardando confirmações...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: []
      });
      console.log("NexusToken verificado!");

      await hre.run("verify:verify", {
        address: agentsAddress,
        constructorArguments: [tokenAddress]
      });
      console.log("NexusAgents verificado!");

      await hre.run("verify:verify", {
        address: stakingAddress,
        constructorArguments: [tokenAddress, agentsAddress]
      });
      console.log("NexusStaking verificado!");
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
