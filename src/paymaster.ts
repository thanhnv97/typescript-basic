// importing required dependencies
import { getDefaultLightAccountFactory, LightSmartContractAccount } from "@alchemy/aa-accounts";
import { AlchemyProvider } from "@alchemy/aa-alchemy";
import { LocalAccountSigner, type SmartAccountSigner } from "@alchemy/aa-core";
import { Utils, Wallet } from "alchemy-sdk";
import dotenv from "dotenv";
import { Address, Hex } from "viem";
import { sepolia } from "viem/chains";

dotenv.config();

// init provider
const chain = sepolia;
// Replace with the private key of your EOA that will be the owner of Light Account
const PRIVATE_KEY: Hex = `0x${process.env.PRIVATE_KEY}`;
// Create a signer for your EOA
const ownerSigner: SmartAccountSigner = LocalAccountSigner.privateKeyToAccountSigner(PRIVATE_KEY);
const entryPoint = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
// Create a provider with your EOA as the smart account owner, this provider is used to send user operations from your smart account and interact with the blockchain
const provider = new AlchemyProvider({
	apiKey: process.env.ALCHEMY_API_KEY as string, // Replace with your Alchemy API key, you can get one at https://dashboard.alchemy.com/
	chain,
	// Entrypoint address, you can use a different entrypoint if needed, check out https://docs.alchemy.com/reference/eth-supportedentrypoints for all the supported entrypoints
	entryPointAddress: entryPoint,
}).connect(
	(rpcClient) =>
		new LightSmartContractAccount({
			entryPointAddress: entryPoint,
			chain: rpcClient.chain,
			owner: ownerSigner,
			factoryAddress: getDefaultLightAccountFactory(rpcClient.chain), // Default address for Light Account on Sepolia, you can replace it with your own.
			rpcClient,
		}),
);

const createAccount = async (toAddress: string) => {
	const eoaWallet = new Wallet("943ebee44f0cf5e2f17bdae4326424b5b0c7d79bc1a668cdca5a2646a196167e");
	// Logging the smart account address -- please fund this address with some SepoliaETH in order for the user operations to be executed successfully
	const address = await provider.getAddress();
	console.log("-----------------------------");
	console.log("[bundler] at [36] in [src/paymaster.ts] ::>> ", address); // 0x37fe304C5BE8048BfB31bcA2151631882cFd238D
	console.log("-----------------------------");

	provider.withAlchemyGasManager({
		policyId: process.env.ALCHEMY_POLICY_ID as string,
		entryPoint,
	});

	// sign message
	const nonce = await provider.rpcClient.getTransactionCount({
		address: eoaWallet.address as Address,
	});

	const transaction = {
		to: toAddress,
		value: Utils.parseEther("0.001"),
		// gasLimit: "21000",
		// maxPriorityFeePerGas: Utils.parseUnits("5", "gwei"),
		// maxFeePerGas: Utils.parseUnits("20", "gwei"),
		// nonce,
		// type: 2,
		// chainId: chain.id,
	};

	console.log("-----------------------------");
	console.log("[eoaWallet.address] at [60] in [src/paymaster.ts] ::>> ", eoaWallet.address); // 0x8F8eD6f7ad723fD6967b7672eD59ADAD08d1CF43
	console.log("-----------------------------");

	const rawTransaction = (await eoaWallet.signTransaction(transaction)) as Hex;

	// Send a user operation from your smart contract account
	// const { hash } = await provider.sendUserOperation({
	// 	target: toAddress as Hex, // Replace with the desired target address
	// 	data: rawTransaction, // Replace with the desired call data
	// });

	const hash = await provider.sendTransaction({
		from: eoaWallet.address as Hex,
		to: toAddress as Hex,
		data: rawTransaction,
	});

	console.log("-----------------------------");
	console.log("[hash] at [73] in [src/paymaster.ts] ::>> ", hash); // Log the user operation hash
	console.log("-----------------------------");

	const receipt = await provider.getUserOperationReceipt(hash);
	console.log("-----------------------------");
	console.log("[receipt] at [79] in [src/paymaster.ts] ::>> ", receipt);
	console.log("-----------------------------");
};

void createAccount("0xa238b6008Bc2FBd9E386A5d4784511980cE504Cd").then();
