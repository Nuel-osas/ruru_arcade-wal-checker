class WalAirdropExplorer {
    constructor() {
        console.log('WalAirdropExplorer constructor called');
        this.apiUrl = 'https://fullnode.mainnet.sui.io:443';
    }

    initialize() {
        console.log('WalAirdropExplorer initialize called');
        this.transactionContainer = document.getElementById('transactionDetails');
        this.loadingSpinner = document.querySelector('.loading-spinner');
        this.searchInput = document.getElementById('searchInput');
        this.searchButton = document.getElementById('searchButton');
        
        if (!this.transactionContainer || !this.loadingSpinner || !this.searchInput || !this.searchButton) {
            console.error('Could not find required DOM elements');
            return;
        }

        // Add event listeners for search
        this.searchButton.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Add input animation
        this.searchInput.addEventListener('focus', () => {
            this.searchInput.parentElement.classList.add('scale-[1.02]');
        });
        this.searchInput.addEventListener('blur', () => {
            this.searchInput.parentElement.classList.remove('scale-[1.02]');
        });
    }

    async resolveSuiNSDomain(domain) {
        try {
            // First try the new method
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'suix_resolveNameServiceAddress',
                    params: [domain]
                })
            });
            
            const data = await response.json();
            console.log('SuiNS resolution response:', data);
            
            if (data.error) {
                throw new Error(data.error.message);
            }
            
            if (!data.result) {
                throw new Error(`Domain "${domain}" is not registered`);
            }
            
            return data.result;
        } catch (error) {
            console.error('Error resolving SuiNS domain:', error);
            
            // If the first method fails, try the alternative endpoint
            try {
                const altResponse = await fetch('https://suins-api.k-g.me/name/address', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: domain })
                });
                
                const altData = await altResponse.json();
                console.log('Alternative SuiNS resolution response:', altData);
                
                if (altData.error || !altData.data) {
                    throw new Error(altData.error || 'Domain not found');
                }
                
                return altData.data;
            } catch (altError) {
                console.error('Error with alternative SuiNS resolution:', altError);
                throw new Error(`Could not resolve SuiNS domain "${domain}". The domain may not be registered.`);
            }
        }
    }

    async handleSearch() {
        const searchTerm = this.searchInput.value.trim();
        if (!searchTerm) {
            this.renderError({ message: 'Please enter a wallet address or SuiNS domain' });
            return;
        }

        try {
            this.showLoading();
            
            // Check if this is a SuiNS domain
            let address = searchTerm;
            if (searchTerm.toLowerCase().endsWith('.sui')) {
                try {
                    address = await this.resolveSuiNSDomain(searchTerm);
                    if (!address) {
                        throw new Error(`No address found for SuiNS domain "${searchTerm}"`);
                    }
                } catch (error) {
                    this.hideLoading();
                    this.renderError(error);
                    return;
                }
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'suix_getOwnedObjects',
                    params: [
                        address,
                        {
                            filter: {
                                MatchAll: [
                                    {
                                        StructType: "0x98af8b8fde88f3c4bdf0fcedcf9afee7d10f66d480b74fb5a3a2e23dc7f5a564::airdrop::WALAirdrop"
                                    }
                                ]
                            },
                            options: {
                                showContent: true,
                                showType: true,
                                showDisplay: true
                            }
                        }
                    ]
                })
            });
            
            const data = await response.json();
            console.log('Search response:', data);
            
            if (data.error) {
                throw new Error(data.error.message);
            }
            
            this.hideLoading();
            this.renderWalletAirdrops(data.result.data, address, searchTerm);
        } catch (error) {
            console.error('Error searching wallet:', error);
            this.hideLoading();
            this.renderError(error);
        }
    }

    showLoading() {
        this.loadingSpinner.classList.remove('hidden');
        this.transactionContainer.innerHTML = '';
    }

    hideLoading() {
        this.loadingSpinner.classList.add('hidden');
    }

    formatAddress(address) {
        if (!address) return 'N/A';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    renderWalletAirdrops(airdrops, address, searchTerm) {
        if (!airdrops || airdrops.length === 0) {
            this.transactionContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 text-center">
                    <div class="w-20 h-20 mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold mb-2">No WAL Airdrops Found</h3>
                    <p class="text-gray-400 max-w-md">
                        ${searchTerm.toLowerCase().endsWith('.sui') 
                            ? `No WAL Airdrops were found for ${searchTerm} (${this.formatAddress(address)})`
                            : `No WAL Airdrops were found for address: ${this.formatAddress(address)}`}
                    </p>
                </div>
            `;
            return;
        }

        const gridClasses = airdrops.length === 1 ? 'md:grid-cols-2' : 
                          airdrops.length === 2 ? 'md:grid-cols-2' : 
                          'md:grid-cols-3 lg:grid-cols-4';

        this.transactionContainer.innerHTML = `
            <div class="mb-6 text-center">
                <div class="inline-flex items-center px-4 py-2 rounded-full bg-primary-500/10 text-primary-400 mb-3">
                    ${searchTerm.toLowerCase().endsWith('.sui') ? `
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        ${searchTerm}
                        <span class="text-xs ml-2 text-gray-400">(${this.formatAddress(address)})</span>
                    ` : `
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        ${this.formatAddress(address)}
                    `}
                </div>
                <h2 class="text-2xl font-semibold mb-1">WAL Airdrop Collection</h2>
                <p class="text-gray-400 text-sm">Found ${airdrops.length} airdrop${airdrops.length === 1 ? '' : 's'}</p>
            </div>
            <div class="grid gap-4 ${gridClasses}">
                ${airdrops.map(airdrop => {
                    const display = airdrop.data.display?.data || {};
                    const imageUrl = display.image_url || 'https://placehold.co/400x400?text=No+Image';
                    const name = display.name || 'WAL Airdrop';
                    const description = display.description || 'No description available';
                    
                    return `
                        <div class="group">
                            <div class="transaction-item bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary-500/10">
                                <div class="aspect-square overflow-hidden">
                                    <img src="${imageUrl}" 
                                         alt="${name}"
                                         class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                         onerror="this.src='https://placehold.co/400x400?text=Error+Loading+Image'">
                                </div>
                                <div class="p-4">
                                    <h3 class="text-base font-semibold mb-1 text-white/90 truncate">${name}</h3>
                                    <p class="text-gray-400 text-xs mb-3 line-clamp-2">${description}</p>
                                    
                                    <div class="flex items-center justify-between pt-2 border-t border-gray-700/50">
                                        <div class="text-xs">
                                            <p class="text-gray-400 mb-0.5">Object ID</p>
                                            <p class="font-mono text-primary-300">${this.formatAddress(airdrop.data.objectId)}</p>
                                        </div>
                                        <button class="copy-button ml-2 p-1.5 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 transition-colors"
                                                onclick="navigator.clipboard.writeText('${airdrop.data.objectId}')">
                                            <svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderError(error) {
        this.transactionContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-24 h-24 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                    <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 class="text-xl font-semibold mb-2">Error</h3>
                <p class="text-gray-400 max-w-md">
                    ${error.message}
                </p>
            </div>
        `;
    }
}

// Create instance
const explorer = new WalAirdropExplorer();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => explorer.initialize());
} else {
    explorer.initialize();
}

export default explorer;
