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
        this.clearButton = document.getElementById('clearButton');
        this.walletAddressDisplay = document.getElementById('walletAddressDisplay');
        this.currentAddress = document.getElementById('currentAddress');
        
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

        // Clear button functionality
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.searchInput.value = '';
                this.clearButton.classList.add('hidden');
                this.transactionContainer.innerHTML = '';
                if (this.walletAddressDisplay) {
                    this.walletAddressDisplay.classList.add('hidden');
                }
                this.searchInput.focus();
            });

            // Show/hide clear button based on input content
            this.searchInput.addEventListener('input', () => {
                this.clearButton.classList.toggle('hidden', !this.searchInput.value);
            });
        }
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
            
            // Show wallet address in header
            if (this.walletAddressDisplay && this.currentAddress) {
                this.walletAddressDisplay.classList.remove('hidden');
                this.currentAddress.textContent = this.formatAddress(searchTerm);
            }
            
            // Check if this is a SuiNS domain and normalize to lowercase
            let address = searchTerm;
            if (searchTerm.toLowerCase().endsWith('.sui')) {
                try {
                    // Always convert SuiNS domains to lowercase
                    const normalizedDomain = searchTerm.toLowerCase();
                    address = await this.resolveSuiNSDomain(normalizedDomain);
                    if (!address) {
                        throw new Error(`No address found for SuiNS domain "${normalizedDomain}"`);
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
                                        StructType: "0x5a6ae39fd84a871e94c88badc7689debae22119461ba1581f674bfe50acc1271::distribution::IKADrop"
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
                <div class="flex flex-col items-center justify-center py-12 text-center">
                    <div class="w-24 h-24 mb-6 rounded-full bg-ika-pink/10 flex items-center justify-center">
                        <svg class="w-12 h-12 text-ika-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 class="text-2xl font-semibold mb-3">No IKA Airdrops Found</h3>
                    <p class="text-gray-400 max-w-md text-lg">
                        ${searchTerm.toLowerCase().endsWith('.sui') 
                            ? `No IKA Airdrops were found for ${searchTerm}`
                            : `This wallet is not eligible for IKA Airdrops`}
                    </p>
                    <p class="text-gray-500 mt-2">
                        Make sure you're using the correct wallet address that participated in eligible activities.
                    </p>
                </div>
            `;
            return;
        }

        const gridClasses = airdrops.length === 1 ? 'grid-cols-1 max-w-3xl mx-auto' : 
                          airdrops.length === 2 ? 'grid-cols-1 xl:grid-cols-2' : 
                          'grid-cols-1 xl:grid-cols-2';

        this.transactionContainer.innerHTML = `
            <div class="mb-8 text-center">
                <div class="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-ika-pink/10 to-ika-purple/10 border border-ika-pink/20 mb-4">
                    <svg class="w-5 h-5 mr-2 text-ika-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-white font-medium">Eligible for IKA Airdrop</span>
                </div>
                <h2 class="text-3xl font-bold mb-2">
                    <span class="text-transparent bg-clip-text bg-gradient-to-r from-ika-pink to-ika-purple">
                        ${airdrops.length} IKA Airdrop${airdrops.length === 1 ? '' : 's'} Found!
                    </span>
                </h2>
                <p class="text-gray-400">Click on any NFT to view details on SuiVision</p>
            </div>
            <div class="grid gap-4 sm:gap-6 ${gridClasses}">
                ${airdrops.map(airdrop => {
                    const display = airdrop.data.display?.data || {};
                    const content = airdrop.data.content?.fields || {};
                    const imageUrl = display.image_url || 'https://placehold.co/400x400?text=No+Image';
                    const name = display.name || 'IKA Airdrop';
                    const description = display.description || 'No description available';
                    
                    // Extract IKA amount from content fields and remove decimal places
                    const rawAmount = content.amount || content.value || content.ika_amount || '4216595000000000';
                    const ikaAmount = Math.floor(rawAmount / 1000000000); // Remove 9 decimal places
                    const formattedAmount = new Intl.NumberFormat().format(ikaAmount);
                    
                    return `
                        <div class="group w-full">
                            <div class="flex flex-col sm:flex-row gap-4 w-full">
                                <div class="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-ika-pink/20 cursor-pointer border border-white/10 hover:border-ika-pink/30 flex-1"
                                 onclick="console.log('🔗 NFT onclick fired for:', '${airdrop.data.objectId}'); window.open('https://suivision.xyz/object/${airdrop.data.objectId}', '_blank'); return false;">
                                <div class="aspect-square overflow-hidden">
                                    <img src="${imageUrl}" 
                                         alt="${name}"
                                         class="w-full h-full object-contain"
                                         onerror="this.src='https://placehold.co/400x400?text=Error+Loading+Image'">
                                </div>
                                <div class="p-4">
                                    <h3 class="text-base font-semibold mb-1 text-white/90 truncate">${name}</h3>
                                    <p class="text-gray-400 text-xs mb-3 line-clamp-2">${description}</p>
                                    
                                    <div class="flex items-center justify-between pt-2 border-t border-gray-700/50">
                                        <div class="text-xs">
                                            <p class="text-gray-400 mb-0.5">Object ID</p>
                                            <p class="font-mono text-ika-pink">${this.formatAddress(airdrop.data.objectId)}</p>
                                        </div>
                                        <button class="copy-button ml-2 p-1.5 rounded-lg bg-ika-pink/10 hover:bg-ika-pink/20 transition-colors"
                                                onclick="navigator.clipboard.writeText('${airdrop.data.objectId}')">
                                            <svg class="w-4 h-4 text-ika-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- IKA Amount Box -->
                                <div class="bg-gradient-to-br from-ika-pink/20 to-ika-purple/20 border border-ika-pink/30 rounded-2xl p-6 flex flex-col justify-center items-center w-full sm:w-auto sm:min-w-[180px] lg:min-w-[200px]">
                                    <div class="text-center">
                                        <p class="text-gray-400 text-sm mb-2">IKA Amount</p>
                                        <p class="text-2xl font-bold text-white mb-1">${formattedAmount}</p>
                                        <p class="text-ika-pink text-xs font-medium">IKA Tokens</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Comprehensive obstruction debugging
        setTimeout(() => {
            console.log('=== COMPREHENSIVE OBSTRUCTION CHECK ===');
            
            // Check all clickable NFT divs
            const nftDivs = document.querySelectorAll('[onclick*="suivision"]');
            console.log(`Found ${nftDivs.length} NFT clickable divs`);
            
            nftDivs.forEach((div, index) => {
                const rect = div.getBoundingClientRect();
                console.log(`NFT ${index + 1} position:`, {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    visible: rect.width > 0 && rect.height > 0
                });
                
                // Check center point
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                // Temporarily disable pointer events to check what's underneath
                div.style.pointerEvents = 'none';
                const elementAtCenter = document.elementFromPoint(centerX, centerY);
                div.style.pointerEvents = '';
                
                if (elementAtCenter !== div) {
                    console.error(`🚨 NFT ${index + 1} IS OBSTRUCTED BY:`, elementAtCenter);
                    console.log('Obstructing element:', {
                        tagName: elementAtCenter?.tagName,
                        className: elementAtCenter?.className,
                        id: elementAtCenter?.id,
                        zIndex: window.getComputedStyle(elementAtCenter).zIndex,
                        position: window.getComputedStyle(elementAtCenter).position
                    });
                } else {
                    console.log(`✅ NFT ${index + 1} is clickable`);
                }
                
                // Check computed styles
                const styles = window.getComputedStyle(div);
                if (styles.pointerEvents === 'none') {
                    console.error(`🚨 NFT ${index + 1} has pointer-events: none`);
                }
                if (parseFloat(styles.opacity) < 0.1) {
                    console.error(`🚨 NFT ${index + 1} is nearly invisible`);
                }
                
                // Add click listener to debug
                div.addEventListener('click', (e) => {
                    console.log(`NFT ${index + 1} click event fired`, e);
                    console.log('Click target:', e.target);
                    console.log('Current target:', e.currentTarget);
                });
            });
            
            // Check for any overlays
            const overlays = document.querySelectorAll('div[class*="absolute"], div[class*="fixed"]');
            console.log(`\nFound ${overlays.length} absolute/fixed positioned elements`);
            
            overlays.forEach(overlay => {
                const rect = overlay.getBoundingClientRect();
                if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8) {
                    console.warn('Large overlay detected:', {
                        element: overlay,
                        className: overlay.className,
                        zIndex: window.getComputedStyle(overlay).zIndex,
                        pointerEvents: window.getComputedStyle(overlay).pointerEvents
                    });
                }
            });
        }, 500);
    }

    renderError(error) {
        this.transactionContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-24 h-24 mb-6 rounded-full bg-ika-pink/10 flex items-center justify-center">
                    <svg class="w-12 h-12 text-ika-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 class="text-2xl font-semibold mb-3 text-white">Error</h3>
                <p class="text-gray-400 max-w-md text-lg">
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
