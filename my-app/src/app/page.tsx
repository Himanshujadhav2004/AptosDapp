import { TokenTransfer } from './components';

const CONTRACT_ADDRESS = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            AptosDApp
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Experience the future of decentralized applications on Aptos. Connect your wallet and transfer tokens securely.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🚀 Fast & Secure</h3>
            <p className="text-gray-600">Built on Aptos blockchain for optimal performance</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🔗 Easy Integration</h3>
            <p className="text-gray-600">Seamless wallet connection experience</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">💎 Modern UI</h3>
            <p className="text-gray-600">Beautiful and intuitive user interface</p>
          </div>
        </div>
      </div>

      {/* Token Transfer Section */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Transfer APT Tokens</h2>
          <p className="text-lg text-gray-600">Send Aptos tokens to any address on the network</p>
        </div>
        <TokenTransfer contractAddress={CONTRACT_ADDRESS} />
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Wallets</h3>
          <p className="text-gray-600">
            Connect with popular Aptos wallets including Petra, Pontem, and more for secure transactions.
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Lightning Fast</h3>
          <p className="text-gray-600">
            Experience sub-second transaction times powered by Aptos' parallel execution engine.
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Developer Friendly</h3>
          <p className="text-gray-600">
            Built with modern tools and best practices for a smooth development experience.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-xl mb-8 opacity-90">
          Connect your wallet using the button in the navigation bar above.
        </p>
        <div className="flex justify-center space-x-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <span className="text-sm font-medium">Supported Wallets</span>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <span className="text-sm font-medium">Petra • Pontem • Martians</span>
          </div>
        </div>
      </div>
    </div>
  );
}
