import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * WDK pulls in native bindings (sodium-native). They must stay outside the
   * server bundle or the build fails resolving the `.node` binding.
   */
  serverExternalPackages: [
    "@tetherto/wdk",
    "@tetherto/wdk-wallet",
    "@tetherto/wdk-wallet-evm",
    "sodium-native",
  ],
};

export default nextConfig;
