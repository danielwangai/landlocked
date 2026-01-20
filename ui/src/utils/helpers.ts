export const getClusterURL = (cluster: string): string => {
  const clusterUrls: any = {
    "mainnet-beta": "https://api.mainnet-beta.solana.com",
    testnet: "https://api.testnet.solana.com",
    devnet: "https://api.devnet.solana.com",
    localnet: "http://127.0.0.1:8899",
  };

  return clusterUrls[cluster];
};

export const getCluster = (cluster: string): string => {
  const clusters: any = {
    "https://api.mainnet-beta.solana.com": "mainnet-beta",
    "https://api.testnet.solana.com": "testnet",
    "https://api.devnet.solana.com": "devnet",
    "http://127.0.0.1:8899": "localnet",
  };

  return clusters[getClusterURL(cluster)];
};
