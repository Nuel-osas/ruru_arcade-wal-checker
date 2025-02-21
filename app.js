import { SuiClient } from '@mysten/sui/client';

class TransactionExplorer {
    constructor() {
        this.client = new SuiClient({
            url: 'https://fullnode.mainnet.sui.io:443'
        });
        this.transactionContainer = document.getElementById('transactionDetails');
        this.loadingSpinner = document.querySelector('.loading-spinner');
    }

    async init() {
        try {
            this.showLoading();
            const response = await this.client.queryTransactionBlocks({
                filter: {
                    MoveFunction: {
                        package: "0x98af8b8fde88f3c4bdf0fcedcf9afee7d10f66d480b74fb5a3a2e23dc7f5a564",
                        module: "distribution",
                        function: "distribute",
                    }
                },
                options: {
                    showEffects: true,
                    showObjectChanges: true,
                    showInput: true,
                },
                limit: 10, // Increased limit to show more transactions
            });
            this.hideLoading();
            this.renderTransactions(response.data);
        } catch (error) {
            console.error('Error fetching transaction:', error);
            this.hideLoading();
            this.renderError(error);
        }
    }

    showLoading() {
        this.loadingSpinner.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingSpinner.classList.add('hidden');
    }

    formatAddress(address) {
        if (!address) return 'N/A';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    renderTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            this.transactionContainer.innerHTML = `
                <div class="bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg p-4 text-yellow-500">
                    No transactions found for this query.
                </div>
            `;
            return;
        }

        this.transactionContainer.innerHTML = '';
        transactions.forEach(tx => {
            const txElement = document.createElement('div');
            txElement.className = 'transaction-item';
            
            const status = tx.effects?.status?.status || 'unknown';
            const statusBadge = `<span class="badge ${status === 'success' ? 'success' : 'pending'}">${status}</span>`;

            // Extract created objects of type WALAirdrop
            const walAirdrops = tx.effects.created.filter(effect => 
                effect.objectType.includes('airdrop::WALAirdrop')
            );

            // Extract created Locked objects
            const lockedObjects = tx.effects.created.filter(effect => 
                effect.objectType.includes('airdrop::Locked')
            );

            txElement.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold mb-2">Distribution Transaction ${statusBadge}</h3>
                        <p class="text-gray-400 mb-1">
                            <span class="font-medium">Digest:</span> 
                            <span class="font-mono">${this.formatAddress(tx.digest)}</span>
                            <button class="copy-button ml-2" onclick="navigator.clipboard.writeText('${tx.digest}')">
                                Copy
                            </button>
                        </p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-400">
                            ${new Date(parseInt(tx.effects.timestampMs)).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div class="details-grid">
                    <div>
                        <h4 class="text-sm font-medium text-gray-400 mb-1">Sender</h4>
                        <p class="font-mono truncate">${this.formatAddress(tx.transaction.data.sender)}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-400 mb-1">Gas Budget</h4>
                        <p>${parseInt(tx.transaction.data.gasData.budget).toLocaleString()} MIST</p>
                    </div>
                </div>

                <div class="mt-4">
                    <h4 class="text-sm font-medium text-gray-400 mb-2">Distribution Summary</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-gray-400">WAL Airdrops Created</p>
                            <p class="text-green-400">${walAirdrops.length}</p>
                        </div>
                        <div>
                            <p class="text-gray-400">Locked Objects Created</p>
                            <p class="text-blue-400">${lockedObjects.length}</p>
                        </div>
                    </div>
                </div>

                <div class="mt-4">
                    <h4 class="text-sm font-medium text-gray-400 mb-2">Gas Usage</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-gray-400">Computation Cost</p>
                            <p>${parseInt(tx.effects.gasUsed.computationCost).toLocaleString()}</p>
                        </div>
                        <div>
                            <p class="text-gray-400">Storage Cost</p>
                            <p>${parseInt(tx.effects.gasUsed.storageCost).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            `;

            this.transactionContainer.appendChild(txElement);
        });
    }

    renderError(error) {
        this.transactionContainer.innerHTML = `
            <div class="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4 text-red-500">
                <h3 class="font-semibold mb-2">Error Fetching Transaction</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Initialize the explorer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const explorer = new TransactionExplorer();
    explorer.init();
});
