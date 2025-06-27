let isInitialized = false;

const appState = {
    currentUserRole: null,
    currentOverallMainMappingsData: [],
    currentOverallPinelabsData: [],
    currentUserPinelabsData: [],
    currentMappingsData: [],
    hasSubmittedInSession: false,
    submittedIds: new Set(),
    formDataCache: {},
    adminNotification: localStorage.getItem('adminNotification') || '', // Initialize with stored value
};

// Utility Functions
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const updateLoadingMessage = (message) => {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.textContent = message;
    }
};

const retrySupabaseCall = async (fn, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
};

// Debug Logging
const logDebug = (message) => {
    console.log(`[DEBUG] ${message} at ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
};

// Role and UI Visibility
const checkUserRole = async () => {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            logDebug('No authenticated user found');
            throw new Error('No user found');
        }
        
        logDebug(`Checking role for email: ${user.email}`);
        const { data, error } = await retrySupabaseCall(() =>
            window.supabaseClient
                .from('user_stores')
                .select('role')
                .eq('email_id', user.email)
        );

        if (error) {
            logDebug(`Error querying user_stores: ${error.message} (Code: ${error.code})`);
            if (error.code === 'PGRST116' || error.code === '42P01') {
                logDebug('user_stores table not found or no data, defaulting to user');
                return 'user';
            }
            throw error;
        }

        logDebug(`User_stores data retrieved: ${JSON.stringify(data)}`);
        const role = data.length > 0 && data.some(r => r.role === 'admin') ? 'admin' : 'user';
        logDebug(`Assigned role: ${role} for email: ${user.email}`);
        appState.currentUserRole = role;
        return role;
    } catch (error) {
        logDebug(`Role check failed: ${error.message}`);
        window.showToast('Failed to determine user role, defaulting to user', 'warning');
        appState.currentUserRole = 'user';
        return 'user';
    }
};

const updateUIVisibilityBasedOnRole = (role, elements) => {
    const { mainTabPaper, mainTabOverall, paperFinanceContent, overallMappingContent, formSection } = elements;

    logDebug(`Updating UI for role: ${role}`);

    if (!mainTabPaper || !paperFinanceContent) {
        logDebug('Missing critical UI elements (paper tab or content)');
        return;
    }

    mainTabPaper.classList.remove('hidden');
    paperFinanceContent.classList.remove('hidden');
    if (formSection) {
        formSection.classList.remove('hidden');
        formSection.style.display = 'block';
        logDebug('Form section displayed for all users');
    }

    if (mainTabOverall && overallMappingContent) {
        if (role === 'admin') {
            mainTabOverall.classList.remove('hidden');
            overallMappingContent.classList.remove('hidden');
            logDebug('Overall mapping tab and content displayed for admin');
            setupAdminNotificationButton(elements); // Add admin notification button
            applyDarkTheme(); // Apply dark theme for admin
        } else {
            mainTabOverall.classList.add('hidden');
            overallMappingContent.classList.add('hidden');
            logDebug('Overall mapping tab and content hidden for non-admin');
            const overallMainTable = document.getElementById('overall-main-mapping-table-body');
            const overallPinelabsTable = document.getElementById('overall-pinelabs-table-body');
            if (overallMainTable) {
                overallMainTable.innerHTML = '<tr class="skeleton-row"><td colspan="10"></td></tr><tr class="skeleton-row"><td colspan="10"></td></tr><tr class="skeleton-row"><td colspan="10"></td></tr>';
            }
            if (overallPinelabsTable) {
                overallPinelabsTable.innerHTML = '<tr class="skeleton-row"><td colspan="9"></td></tr><tr class="skeleton-row"><td colspan="9"></td></tr><tr class="skeleton-row"><td colspan="9"></td></tr>';
            }
            showNonAdminNotification(); // Show notification for non-admins
        }
    }
};

// Admin Notification Functions
const setupAdminNotificationButton = (elements) => {
    if (document.getElementById('admin-notify-btn')) return; // Avoid duplicate buttons

    const btn = document.createElement('button');
    btn.id = 'admin-notify-btn';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.left = '10px';
    btn.style.padding = '15px 40px';
    btn.style.backgroundColor = '#1a1a2e';
    btn.style.color = '#00d4ff';
    btn.style.border = '1px solid #00d4ff';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '16px';
    btn.style.zIndex = '1001';
    btn.textContent = 'Notify';
    document.body.appendChild(btn);

    let textBox = null;
    let saveBtn = null;
    let deleteBtn = null;
    let closeBtn = null;

    btn.addEventListener('click', () => {
        if (!textBox) {
            textBox = document.createElement('textarea');
            textBox.id = 'admin-notify-text';
            textBox.style.position = 'fixed';
            textBox.style.top = '70px';
            textBox.style.left = '10px';
            textBox.style.width = '300px';
            textBox.style.height = '100px';
            textBox.style.padding = '10px';
            textBox.style.border = '1px solid #00d4ff';
            textBox.style.borderRadius = '5px';
            textBox.style.backgroundColor = '#16213e';
            textBox.style.color = '#e0e0e0';
            textBox.style.display = 'block';
            textBox.value = appState.adminNotification;
            document.body.appendChild(textBox);

            saveBtn = document.createElement('button');
            saveBtn.style.position = 'fixed';
            saveBtn.style.top = '180px';
            saveBtn.style.left = '10px';
            saveBtn.style.padding = '10px 20px';
            saveBtn.style.backgroundColor = '#1a1a2e';
            saveBtn.style.color = '#00d4ff';
            saveBtn.style.border = '1px solid #00d4ff';
            saveBtn.style.borderRadius = '5px';
            saveBtn.textContent = 'Save';
            document.body.appendChild(saveBtn);

            deleteBtn = document.createElement('button');
            deleteBtn.style.position = 'fixed';
            deleteBtn.style.top = '180px';
            deleteBtn.style.left = '130px';
            deleteBtn.style.padding = '10px 20px';
            deleteBtn.style.backgroundColor = '#1a1a2e';
            deleteBtn.style.color = '#ff4444';
            deleteBtn.style.border = '1px solid #ff4444';
            deleteBtn.style.borderRadius = '5px';
            deleteBtn.textContent = 'Delete';
            document.body.appendChild(deleteBtn);

            closeBtn = document.createElement('button');
            closeBtn.style.position = 'fixed';
            closeBtn.style.top = '180px';
            closeBtn.style.left = '250px';
            closeBtn.style.padding = '10px 20px';
            closeBtn.style.backgroundColor = '#1a1a2e';
            closeBtn.style.color = '#ff4444';
            closeBtn.style.border = '1px solid #ff4444';
            closeBtn.style.borderRadius = '5px';
            closeBtn.textContent = 'Close';
            document.body.appendChild(closeBtn);

            saveBtn.addEventListener('click', () => {
                const content = textBox.value.trim();
                if (content) {
                    appState.adminNotification = content;
                    localStorage.setItem('adminNotification', content);
                    window.showToast('Notification updated and sent to non-admins', 'success');
                    broadcastNotificationToNonAdmins(content);
                }
            });

            deleteBtn.addEventListener('click', () => {
                textBox.value = '';
                appState.adminNotification = '';
                localStorage.setItem('adminNotification', '');
                window.showToast('Notification deleted', 'success');
            });

            closeBtn.addEventListener('click', () => {
                if (textBox && textBox.parentNode) textBox.remove();
                if (saveBtn && saveBtn.parentNode) saveBtn.remove();
                if (deleteBtn && deleteBtn.parentNode) deleteBtn.remove();
                if (closeBtn && closeBtn.parentNode) closeBtn.remove();
                textBox = null;
                saveBtn = null;
                deleteBtn = null;
                closeBtn = null;
            });
        }
    });
};

const broadcastNotificationToNonAdmins = (content) => {
    localStorage.setItem('adminNotification', content);
    if (appState.currentUserRole !== 'admin') {
        showNonAdminNotification();
    }
};

const showNonAdminNotification = () => {
    if (appState.currentUserRole === 'admin') return;

    const existingNotification = document.getElementById('non-admin-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.id = 'non-admin-notification';
    notification.style.position = 'fixed';
    notification.style.top = '50%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.padding = '20px';
    notification.style.backgroundColor = '#1a1a2e';
    notification.style.border = '2px solid #00d4ff';
    notification.style.borderRadius = '10px';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
    notification.style.zIndex = '1000';
    notification.style.animation = 'fadeIn 0.5s ease-in, pulseBorder 2s infinite';
    notification.style.display = 'flex';
    notification.style.flexDirection = 'column';
    notification.style.gap = '10px';
    notification.style.maxWidth = '400px';
    notification.style.height = 'auto';

    const title = document.createElement('h2');
    title.textContent = 'Notification';
    title.style.color = '#00d4ff';
    title.style.margin = '0';
    title.style.fontSize = '20px';
    notification.appendChild(title);

    const content = document.createElement('p');
    content.id = 'notification-text';
    content.textContent = localStorage.getItem('adminNotification') || 'No new notifications';
    content.style.color = '#e0e0e0';
    content.style.fontSize = '16px';
    content.style.margin = '0';
    content.style.animation = 'textSlide 2s infinite';
    notification.appendChild(content);

    const cancelBtn = document.createElement('span');
    cancelBtn.id = 'cancel-notification';
    cancelBtn.style.position = 'absolute';
    cancelBtn.style.top = '5px';
    cancelBtn.style.right = '5px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '20px';
    cancelBtn.style.color = '#ff4444';
    cancelBtn.textContent = '×';
    notification.appendChild(cancelBtn);

    document.body.appendChild(notification);

    const autoClose = setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => notification.remove(), 500);
    }, 5000);

    cancelBtn.addEventListener('click', () => {
        clearTimeout(autoClose);
        notification.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => notification.remove(), 500);
    });
};

// Navigation and Tab Switching
const switchMainTab = async (tabName, elements) => {
    const { 
        mainTabPaper, 
        mainTabOverall, 
        paperFinanceContent, 
        overallMappingContent, 
        formSection, 
        mappingTableBody, 
        pinelabsTableBody, 
        overallMainMappingTableBody, 
        overallPinelabsTableBody 
    } = elements;

    if (!mainTabPaper || !paperFinanceContent || !formSection || !mappingTableBody || !pinelabsTableBody) {
        logDebug('Missing critical elements for tab switching');
        window.showToast('Application error: Missing UI elements', 'error');
        return;
    }

    logDebug(`Switching to tab: ${tabName}, Current role: ${appState.currentUserRole}`);

    mainTabPaper.classList.remove('active');
    mainTabOverall?.classList.remove('active');
    paperFinanceContent.classList.add('hidden');
    overallMappingContent?.classList.add('hidden');
    formSection.classList.add('hidden');

    logDebug(`Clearing all table bodies: mappingTableBody, pinelabsTableBody, overallMainMappingTableBody, overallPinelabsTableBody`);
    mappingTableBody.innerHTML = '<tr class="skeleton-row"><td colspan="10"></td></tr><tr class="skeleton-row"><td colspan="10"></td></tr><tr class="skeleton-row"><td colspan="10"></td></tr>';
    pinelabsTableBody.innerHTML = '<tr class="skeleton-row"><td colspan="9"></td></tr><tr class="skeleton-row"><td colspan="9"></td></tr><tr class="skeleton-row"><td colspan="9"></td></tr>';
    if (overallMainMappingTableBody) {
        overallMainMappingTableBody.innerHTML = '';
        logDebug(`Cleared overallMainMappingTableBody`);
    }
    if (overallPinelabsTableBody) {
        overallPinelabsTableBody.innerHTML = '';
        logDebug(`Cleared overallPinelabsTableBody`);
    }

    try {
        if (tabName === 'paper') {
            logDebug(`Activating paper tab`);
            mainTabPaper.classList.add('active');
            paperFinanceContent.classList.remove('hidden');
            formSection.classList.remove('hidden');
            formSection.style.display = 'block';
            logDebug('Displaying Paper tab with form and user-specific tables');

            if (appState.currentUserRole !== 'admin' && overallMappingContent) {
                overallMappingContent.classList.add('hidden');
                overallMappingContent.style.display = 'none !important';
                logDebug(`Hiding overallMappingContent for non-admin, current display: ${window.getComputedStyle(overallMappingContent).display}`);
                const mainTable = document.querySelector('#overall-main-mapping-table-body')?.closest('table');
                const pinelabsTable = document.querySelector('#overall-pinelabs-table-body')?.closest('table');
                if (mainTable) {
                    logDebug(`Main table parent: ${mainTable.parentElement.id || 'body'}`);
                    if (!mainTable.closest('#overall-mapping-content')) {
                        mainTable.remove();
                        logDebug('Removed stray overall-main-mapping-table outside overallMappingContent');
                    } else {
                        mainTable.style.display = 'none';
                    }
                }
                if (pinelabsTable) {
                    logDebug(`Pinelabs table parent: ${pinelabsTable.parentElement.id || 'body'}`);
                    if (!pinelabsTable.closest('#overall-mapping-content')) {
                        pinelabsTable.remove();
                        logDebug('Removed stray overall-pinelabs-table outside overallMappingContent');
                    } else {
                        pinelabsTable.style.display = 'none';
                    }
                }
            }

            logDebug(`Loading user-specific data for paper tab`);
            await Promise.all([
                loadMappings(elements),
                loadUserPinelabsDetails(elements)
            ]);
            logDebug(`User-specific data loaded for paper tab`);
        } else if (tabName === 'overall' && appState.currentUserRole === 'admin') {
            logDebug(`Activating overall tab for admin`);
            if (mainTabOverall && overallMappingContent) {
                mainTabOverall.classList.add('active');
                overallMappingContent.classList.remove('hidden');
                logDebug('Displaying Overall tab with admin tables');
                formSection.classList.add('hidden');
                logDebug(`Hiding formSection for overall tab`);

                logDebug(`Loading overall data for admin`);
                await Promise.all([
                    loadOverallMainMappings(elements),
                    loadOverallPinelabsDetails(false, elements)
                ]);
                logDebug(`Overall data loaded for admin`);
            } else {
                logDebug('Missing overall tab elements for admin');
                window.showAuthority('Application error: Missing admin UI elements', 'error');
            }
        } else if (tabName === 'overall' && appState.currentUserRole !== 'admin') {
            logDebug(`Non-admin attempting overall tab, reverting to paper tab`);
            mainTabPaper.classList.add('active');
            paperFinanceContent.classList.remove('hidden');
            formSection.classList.remove('hidden');
            formSection.style.display = 'block';
            if (overallMappingContent) overallMappingContent.classList.add('hidden');
            logDebug('Non-admin reverted to paper tab');
            window.showToast('Access to Overall Mapping is restricted to admins', 'error');

            logDebug(`Loading user-specific data for reverted paper tab`);
            await Promise.all([
                loadMappings(elements),
                loadUserPinelabsDetails(elements)
            ]);
            logDebug(`User-specific data loaded for reverted paper tab`);
        }
    } catch (error) {
        logDebug(`Error switching tab: ${error.message}`);
        window.showToast(`Failed to load ${tabName} tab data`, 'error');
    }
};

// Sub-Tab Switching for Financiers and Pine Labs
const setupSubTabListeners = () => {
    const financierTab = document.getElementById('financier-tab');
    const pinelabsTab = document.getElementById('pinelabs-tab');
    const financiersSection = document.getElementById('financiers-section');
    const pinelabsSection = document.getElementById('pinelabs-section');
    const activeTabInput = document.getElementById('active-tab');

    if (!financierTab || !pinelabsTab || !financiersSection || !pinelabsSection || !activeTabInput) {
        logDebug('Sub-tab elements not found');
        window.showToast('Application error: Sub-tab elements missing', 'error');
        return;
    }

    const switchSubTab = (tabName) => {
        logDebug(`Switching to sub-tab: ${tabName}`);

        financierTab.classList.remove('active');
        pinelabsTab.classList.remove('active');
        financiersSection.classList.add('hidden');
        pinelabsSection.classList.add('hidden');

        if (tabName === 'financier') {
            financierTab.classList.add('active');
            financiersSection.classList.remove('hidden');
            activeTabInput.value = 'financier';
        } else if (tabName === 'pinelabs') {
            pinelabsTab.classList.add('active');
            pinelabsSection.classList.remove('hidden');
            activeTabInput.value = 'pinelabs';
        }

        logDebug(`Active sub-tab set to: ${activeTabInput.value}`);
    };

    financierTab.addEventListener('click', () => switchSubTab('financier'));
    pinelabsTab.addEventListener('click', () => switchSubTab('pinelabs'));

    switchSubTab(activeTabInput.value || 'financier');
};

// Dropdown Listeners for Brand and Financier
const setupBrandDropdownListener = () => {
    const brandSelect = document.getElementById('brand');
    const appleCodeSection = document.getElementById('apple-code-section');
    if (!brandSelect || !appleCodeSection) {
        logDebug('Brand dropdown or Apple code section not found');
        return;
    }

    brandSelect.addEventListener('change', () => {
        const selectedBrand = brandSelect.value;
        logDebug(`Brand selected: ${selectedBrand}`);
        appleCodeSection.classList.toggle('hidden', selectedBrand !== 'Apple');
        if (selectedBrand !== 'Apple') {
            document.getElementById('apple-code').value = '';
        }
    });
};

const setupFinancierDropdownListener = () => {
    const financierSelect = document.getElementById('financier');
    if (!financierSelect) {
        logDebug('Financier dropdown not found');
        window.showToast('Application error: Financier dropdown missing', 'error');
        return;
    }

    const financierCodeSections = {
        'Bajaj': 'bajaj-code-section',
        'HDFC': 'hdfc-code-section',
        'HDB': 'hdb-code-section',
        'IDFC': 'idfc-code-section',
        'Kotak': 'kotak-code-section',
        'TVS': 'tvs-code-section',
        'Benow': 'benow-code-section',
        'ICICI': 'icici-code-section',
        'Home Credit': 'home-credit-code-section'
    };

    financierSelect.addEventListener('change', () => {
        const selectedFinancier = financierSelect.value;
        logDebug(`Financier selected: ${selectedFinancier}`);

        Object.values(financierCodeSections).forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('hidden');
                const input = section.querySelector('input');
                if (input) input.value = '';
            }
        });

        if (selectedFinancier && financierCodeSections[selectedFinancier]) {
            const section = document.getElementById(financierCodeSections[selectedFinancier]);
            if (section) {
                section.classList.remove('hidden');
                logDebug(`Showing code section: ${financierCodeSections[selectedFinancier]}`);
            } else {
                logDebug(`Code section not found for financier: ${selectedFinancier}`);
            }
        } else {
            logDebug('No financier selected or invalid financier');
        }
    });
};

// Database Operations
const loadMappings = async (elements) => {
    try {
        updateLoadingMessage('Loading your mappings...');
        elements.mappingTableBody.innerHTML = '<tr class="skeleton-row"><td colspan="10"></td></tr><tr class="skeleton-row"><td colspan="10"></td></tr><tr class="skeleton-row"><td colspan="10"></td></tr>';

        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data, error } = await retrySupabaseCall(() => 
            window.supabaseClient
                .from('finance_mappings')
                .select(`
                    id,
                    store_name,
                    city,
                    mail_id,
                    brand,
                    brand_code,
                    financier,
                    financier_code,
                    requested_by,
                    user_id
                `)
                .eq('mail_id', user.email)
                .order('id', { ascending: false })
        );

        if (error) throw error;

        appState.currentMappingsData = data || [];
        if (typeof window.populateMappingTable === 'function') {
            window.populateMappingTable(data, elements.mappingTableBody, { editable: true });
        } else {
            logDebug('window.populateMappingTable is not defined');
            window.showToast('Error: Table population function missing', 'error');
        }
        return data;
    } catch (error) {
        logDebug(`Error loading mappings: ${error.message}`);
        window.showToast('Failed to load mappings', 'error');
        elements.mappingTableBody.innerHTML = '<tr><td colspan="10" class="empty-state">No data available</td></tr>';
        return [];
    }
};

const loadUserPinelabsDetails = async (elements) => {
    try {
        updateLoadingMessage('Loading your Pine Labs details...');
        elements.pinelabsTableBody.innerHTML = '<tr class="skeleton-row"><td colspan="9"></td></tr><tr class="skeleton-row"><td colspan="9"></td></tr><tr class="skeleton-row"><td colspan="9"></td></tr>';

        const { data: authData } = await window.supabaseClient.auth.getUser();
        if (!authData || !authData.user) throw new Error('No user found');

        const { data, error } = await retrySupabaseCall(() => 
            window.supabaseClient
                .from('pinelabs_details')
                .select(`
                    id,
                    mapping_id,
                    pos_id,
                    tid,
                    serial_no,
                    store_id,
                    user_id,
                    finance_mappings!pinelabs_details_mapping_id_fkey (
                        store_name,
                        brand
                    )
                `)
                .eq('user_id', authData.user.id)
                .order('id', { ascending: false })
        );

        if (error) throw error;

        appState.currentUserPinelabsData = data || [];
        if (typeof window.populatePinelabsTable === 'function') {
            window.populatePinelabsTable(elements.pinelabsTableBody, data, { editable: true });
        } else {
            logDebug('window.populatePinelabsTable is not defined');
            window.showToast('Error: Table population function missing', 'error');
        }
        return data;
    } catch (error) {
        logDebug(`Error loading Pine Labs details: ${error.message}`);
        window.showToast('Failed to load Pine Labs details', 'error');
        elements.pinelabsTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No data available</td></tr>';
        return [];
    }
};

const loadOverallMainMappings = async (elements, page = 1, pageSize = 50) => {
    try {
        logDebug(`Starting loadOverallMainMappings with page: ${page}, pageSize: ${pageSize}`);
        updateLoadingMessage('Loading overall main mappings...');
        if (appState.currentUserRole !== 'admin') {
            logDebug('Skipping loadOverallMainMappings for non-admin');
            return [];
        }
        const { data, error } = await retrySupabaseCall(() => 
            window.supabaseClient
                .from('finance_mappings')
                .select(`
                    id,
                    store_name,
                    city,
                    mail_id,
                    brand,
                    brand_code,
                    financier,
                    financier_code,
                    requested_by,
                    user_id
                `)
                .order('id', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1)
        );
        
        if (error) throw error;
        
        appState.currentOverallMainMappingsData = data || [];
        if (typeof window.populateMappingTable === 'function') {
            window.populateMappingTable(data, document.getElementById('overall-main-mapping-table-body'), { editable: true, isAdminView: true });
            logDebug(`Populated overallMainMappingTableBody with ${data.length} records`);
        }
        return data;
    } catch (error) {
        logDebug(`Error loading overall main mappings: ${error.message}`);
        window.showToast('Failed to load overall main mappings', 'error');
        return [];
    }
};

const loadOverallPinelabsDetails = async (lazy = false, elements) => {
    try {
        logDebug(`Starting loadOverallPinelabsDetails, lazy: ${lazy}`);
        if (!lazy) updateLoadingMessage('Loading overall Pine Labs details...');
        if (appState.currentUserRole !== 'admin') {
            logDebug('Skipping loadOverallPinelabsDetails for non-admin');
            return [];
        }
        const { data, error } = await retrySupabaseCall(() => 
            window.supabaseClient
                .from('pinelabs_details')
                .select(`
                    id,
                    mapping_id,
                    pos_id,
                    tid,
                    serial_no,
                    store_id,
                    user_id,
                    finance_mappings!pinelabs_details_mapping_id_fkey (
                        store_name,
                        brand
                    )
                `)
                .order('id', { ascending: false })
        );
        
        if (error) throw error;
        
        appState.currentOverallPinelabsData = data || [];
        if (typeof window.populatePinelabsTable === 'function') {
            window.populatePinelabsTable(document.getElementById('overall-pinelabs-table-body'), data, { editable: true, isAdminView: true });
            logDebug(`Populated overallPinelabsTableBody with ${data.length} records`);
        }
        return data;
    } catch (error) {
        logDebug(`Error loading overall Pine Labs details: ${error.message}`);
        window.showToast('Failed to load overall Pine Labs details', 'error');
        return [];
    }
};

const insertMapping = async (data, pinelabsEntries) => {
    try {
        logDebug(`Attempting to insert mapping, current hasSubmittedInSession: ${appState.hasSubmittedInSession}`);
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('No user found');

        const financierCodeFields = {
            'Bajaj': 'bajaj-code',
            'HDFC': 'hdfc-code',
            'HDB': 'hdb-code',
            'IDFC': 'idfc-code',
            'Kotak': 'kotak-code',
            'TVS': 'tvs-code',
            'Benow': 'benow-code',
            'ICICI': 'icici-code',
            'Home Credit': 'home-credit-code'
        };

        const mappingData = {
            ...data,
            user_id: user.id,
            financier_code: data.financier && financierCodeFields[data.financier] ? 
                document.getElementById(financierCodeFields[data.financier]).value : ''
        };

        const { data: mapping, error: mappingError } = await retrySupabaseCall(() => 
            window.supabaseClient
                .from('finance_mappings')
                .insert([mappingData])
                .select('id')
                .single()
        );

        if (mappingError) throw mappingError;

        if (pinelabsEntries && pinelabsEntries.length > 0) {
            const pinelabsData = pinelabsEntries.map(entry => ({
                mapping_id: mapping.id,
                pos_id: entry.pos_id,
                tid: entry.tid,
                serial_no: entry.serial_no,
                store_id: entry.store_id,
                user_id: user.id
            }));

            const { error: pinelabsError } = await retrySupabaseCall(() => 
                window.supabaseClient
                    .from('pinelabs_details')
                    .insert(pinelabsData)
            );

            if (pinelabsError) throw pinelabsError;
        }

        appState.hasSubmittedInSession = true;
        appState.submittedIds.add(mapping.id);
        logDebug(`Mapping inserted successfully, ID: ${mapping.id}, hasSubmittedInSession: ${appState.hasSubmittedInSession}`);

        await refreshOverallTables(elements);
        return mapping.id;
    } catch (error) {
        logDebug(`Error inserting mapping: ${error.message}`);
        throw error;
    }
};

const deleteOverallMainMapping = async (id, elements) => {
    try {
        const { error: pinelabsError } = await retrySupabaseCall(() => 
            window.supabaseClient
                .from('pinelabs_details')
                .delete()
                .eq('mapping_id', id)
        );

        if (pinelabsError) throw pinelabsError;

        const { error: mappingError } = await retrySupabaseCall(() => 
            window.supabaseClient
                .from('finance_mappings')
                .delete()
                .eq('id', id)
        );

        if (mappingError) throw mappingError;

        await refreshOverallTables(elements); // Removed invalid 'Allahabad' argument
        window.showToast('Mapping deleted successfully', 'success');
    } catch (error) {
        logDebug(`Error deleting mapping: ${error.message}`);
        window.showToast('Failed to delete mapping', 'error');
    }
};

// Refresh Tables
const refreshOverallTables = async (elements, skipRefresh = false) => {
    logDebug(`Refreshing all tables, skipRefresh: ${skipRefresh}`);

    try {
        if (!skipRefresh) {
            await Promise.all([
                loadMappings(elements),
                loadUserPinelabsDetails(elements),
                appState.currentUserRole === 'admin' && loadOverallMainMappings(elements),
                appState.currentUserRole === 'admin' && loadOverallPinelabsDetails(true, elements)
            ].filter(Boolean)); // Filter out undefined promises for non-admin
            logDebug('All tables refreshed successfully');
        } else {
            logDebug('Refresh skipped as requested');
        }
    } catch (error) {
        logDebug(`Error refreshing tables: ${error.message}`);
        window.showToast('Failed to refresh tables', 'error');
    }
};

// Logout Functionality
const attachLogoutListeners = async () => {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutDropdown = document.getElementById('logout-dropdown');
    const confirmLogout = document.getElementById('confirm-logout');

    if (!logoutBtn || !logoutDropdown || !confirmLogout) {
        logDebug('Logout elements not found');
        return;
    }

    logoutBtn.addEventListener('click', debouncedToggleLogoutDropdown);
    confirmLogout.addEventListener('click', e => window.handleLogout(e, elements));
    document.addEventListener('click', closeDropdownOnClickOutside);
};

const toggleLogoutDropdown = () => {
    const logoutDropdown = document.getElementById('logout-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutDropdown && logoutBtn) {
        const isActive = logoutDropdown.classList.contains('active');
        logoutDropdown.classList.toggle('active', !isActive);
        logoutBtn.setAttribute('aria-expanded', !isActive);
        if (!isActive) {
            document.getElementById('confirm-logout').focus();
        }
        logDebug(`Logout dropdown toggled, active: ${!isActive}`);
    }
};

const debouncedToggleLogoutDropdown = debounce(toggleLogoutDropdown, 300);

const closeDropdownOnClickOutside = (event) => {
    const logoutContainer = document.querySelector('.logout-container');
    const logoutDropdown = document.getElementById('logout-dropdown');

    if (logoutContainer && logoutDropdown && !logoutContainer.contains(event.target)) {
        logoutDropdown.classList.remove('active');
        document.getElementById('logout-btn').setAttribute('aria-expanded', 'false');
        logDebug('Logout dropdown closed on outside click');
    }
};

window.handleLogout = async (event, elements) => {
    event.preventDefault();
    console.log('handleLogout triggered at', new Date().toISOString(), {
        eventType: event.type,
        hasSubmittedInSession: appState?.hasSubmittedInSession,
        currentUserRole: appState?.currentUserRole,
        supabaseClientExists: !!window.supabaseClient
    });

    try {
        if (!window.supabaseClient?.auth) {
            throw new Error('Supabase client is not initialized');
        }

        console.log('Initiating Supabase signOut');
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) {
            console.error('Supabase signOut error:', error);
            throw error;
        }

        const showNotification = false; // Disable notification by default
        console.log('Notification condition check:', {
            showNotification,
            originalCondition: appState?.currentUserRole !== 'admin' && appState?.hasSubmittedInSession
        });

        if (showNotification) {
            console.log('Creating logout notification');
            const style = document.createElement('style');
            style.id = 'logout-notification-style';
            style.textContent = `
                .logout-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background-color: #4caf50;
                    color: white;
                    padding: 15px;
                    border-radius: 5px;
                    z-index: 1000;
                    opacity: 1;
                    transition: opacity 0.5s ease;
                    font-size: 16px;
                }
                .logout-notification.fade-out {
                    opacity: 0;
                }
            `;
            document.head.appendChild(style);
            console.log('Notification CSS appended to head');

            const notification = document.createElement('div');
            notification.textContent = 'The Given Brand Mapping will be Completed within 5 Working Days';
            notification.classList.add('logout-notification');
            document.body.appendChild(notification);
            console.log('Notification appended to DOM');

            setTimeout(() => {
                notification.classList.add('fade-out');
                console.log('Fade-out class added');
                setTimeout(() => {
                    notification.remove();
                    const styleElement = document.getElementById('logout-notification-style');
                    if (styleElement) styleElement.remove();
                    console.log('Notification and CSS removed');
                    window.location.href = 'dashboard.html'; // Changed redirect to dashboard.html
                }, 1000);
            }, 3000);
        } else {
            console.log('No notification shown, redirecting to dashboard.html');
            await refreshOverallTables(elements, true); // Skip refresh during logout
            window.location.href = 'dashboard.html'; // Changed redirect to dashboard.html
        }
    } catch (error) {
        console.error('Logout error:', {
            message: error.message,
            stack: error.stack
        });
        window.showToast?.('Logout failed: ' + error.message, 'error');
    }
};

// Initialization
const initializePage = async (elements) => {
    try {
        updateLoadingMessage('Initializing application...');

        const role = await checkUserRole();
        updateUIVisibilityBasedOnRole(role, elements);

        await attachLogoutListeners();

        if (elements.mainTabPaper) {
            elements.mainTabPaper.addEventListener('click', () => switchMainTab('paper', elements));
        }
        if (elements.mainTabOverall) {
            elements.mainTabOverall.addEventListener('click', () => switchMainTab('overall', elements));
        }

        setupSubTabListeners();
        setupBrandDropdownListener();
        setupFinancierDropdownListener();

        await switchMainTab('paper', elements);

        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
        logDebug('Page initialization completed');
    } catch (error) {
        logDebug(`Initialization error: ${error.message}`);
        window.showToast('Failed to initialize application', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    isInitialized = true;

    const elements = {
        mainTabPaper: document.getElementById('main-tab-paper'),
        mainTabOverall: document.getElementById('main-tab-overall'),
        paperFinanceContent: document.getElementById('paper-finance-content'),
        overallMappingContent: document.getElementById('overall-mapping-content'),
        formSection: document.getElementById('form-section'),
        mappingTableBody: document.getElementById('mapping-table-body'),
        pinelabsTableBody: document.getElementById('pinelabs-table-body'),
        overallMainMappingTableBody: document.getElementById('overall-main-mapping-table-body'),
        overallPinelabsTableBody: document.getElementById('overall-pinelabs-table-body'),
    };

    if (!elements.formSection || !elements.paperFinanceContent) {
        logDebug('Critical elements missing');
        window.showToast('Application initialization failed due to missing elements', 'error');
        return;
    }

    initializePage(elements);
});

// CSS for Animations, Styling, and Dark Theme
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
    @keyframes pulseBorder {
        0% { border-color: #00d4ff; }
        50% { border-color: #7a00ff; }
        100% { border-color: #00d4ff; }
    }
    @keyframes textSlide {
        0% { transform: translateX(0); }
        50% { transform: translateX(5px); }
        100% { transform: translateX(0); }
    }
    @keyframes glow {
        0% { box-shadow: 0 0 5px #00d4ff; }
        50% { box-shadow: 0 0 15px #7a00ff, 0 0 25px #00d4ff; }
        100% { box-shadow: 0 0 5px #00d4ff; }
    }
    body {
        background-color: #1a1a2e;
        color: #e0e0e0;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
    }
    .main-tab {
        padding: 10px 20px;
        margin: 5px;
        background-color: #16213e;
        color: #00d4ff;
        border: 1px solid #00d4ff;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s, color 0.3s;
    }
    .main-tab.active {
        background-color: #00d4ff;
        color: #1a1a2e;
        font-weight: bold;
    }
    .main-tab:hover {
        background-color: #00b3d8;
        color: #1a1a2e;
    }
    #non-admin-notification {
        text-align: center;
        max-width: 400px;
        background: linear-gradient(135deg, #16213e, #1a1a2e);
        padding: 20px;
        border-radius: 10px;
        animation: glow 3s infinite;
    }
    #notification-text {
        font-size: 16px;
        margin: 10px 0;
        animation: textSlide 2s infinite;
    }
    #cancel-notification {
        color: #ff4444;
        font-size: 20px;
    }
    #cancel-notification:hover {
        color: #ff6666;
    }
    #admin-notify-btn {
        background-color: #1a1a2e;
        color: #00d4ff;
        border: 1px solid #00d4ff;
        transition: background-color 0.3s, color 0.3s;
    }
    #admin-notify-btn:hover {
        background-color: #00b3d8;
        color: #1a1a2e;
    }
    #admin-notify-text {
        background-color: #16213e;
        color: #e0e0e0;
        border: 1px solid #00d4ff;
        transition: border-color 0.3s, box-shadow 0.3s;
    }
    #admin-notify-text:focus {
        outline: none;
        border-color: #7a00ff;
        box-shadow: 0 0 10px #7a00ff;
    }
    button {
        background-color: #1a1a2e;
        color: #00d4ff;
        border: 1px solid #00d4ff;
        transition: background-color 0.3s, color 0.3s;
    }
    button:hover {
        background-color: #00b3d8;
        color: #1a1a2e;
    }
    input, textarea, select {
        background-color: #16213e;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 5px;
    }
    input:focus, textarea:focus, select:focus {
        border-color: #00d4ff;
        box-shadow: 0 0 5px #00d4ff;
    }
    table {
        background-color: #16213e;
        color: #e0e0e0;
        border: 1px solid #333;
    }
    th, td {
        border: 1px solid #333;
    }
    .toast {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 10px 15px;
        background-color: #1a1a2e;
        color: #00d4ff;
        border: 1px solid #00d4ff;
        border-radius: 5px;
        text-align: center;
        font-size: 12px;
        z-index: 2000;
        max-width: 200px;
        height: 50px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.3s ease-in, fadeOut 0.3s ease-out 2.5s forwards;
    }
    .toast.success {
        border-color: #00ff00;
        color: #00ff00;
    }
    .toast.warning {
        border-color: #ffaa00;
        color: #ffaa00;
    }
    .toast.error {
        border-color: #ff4444;
        color: #ff4444;
    }
`;

// Dark Theme Application
const applyDarkTheme = () => {
    document.body.style.backgroundColor = '#1a1a2e';
    document.body.style.color = '#e0e0e0';
    const elements = document.querySelectorAll('input, textarea, select, table, th, td');
    elements.forEach(el => {
        el.style.backgroundColor = '#16213e';
        el.style.color = '#e0e0e0';
        el.style.borderColor = '#333';
    });
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.backgroundColor = '#1a1a2e';
        btn.style.color = '#00d4ff';
        btn.style.border = '1px solid #00d4ff';
    });
};

document.head.appendChild(styleSheet);