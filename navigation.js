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
    console.log([DEBUG] ${message} at ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })});
};

// Role and UI Visibility
const checkUserRole = async () => {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            logDebug('No authenticated user found');
            throw new Error('No user found');
        }
        
        logDebug(Checking role for email: ${user.email});
        const { data, error } = await retrySupabaseCall(() =>
            window.supabaseClient
                .from('user_stores')
                .select('role')
                .eq('email_id', user.email)
        );

        if (error) {
            logDebug(Error querying user_stores: ${error.message} (Code: ${error.code}));
            if (error.code === 'PGRST116' || error.code === '42P01') {
                logDebug('user_stores table not found or no data, defaulting to user');
                return 'user';
            }
            throw error;
        }

        logDebug(User_stores data retrieved: ${JSON.stringify(data)});
        const role = data.length > 0 && data.some(r => r.role === 'admin') ? 'admin' : 'user';
        logDebug(Assigned role: ${role} for email: ${user.email});
        appState.currentUserRole = role;
        return role;
    } catch (error) {
        logDebug(Role check failed: ${error.message});
        window.showToast('Failed to determine user role, defaulting to user', 'warning');
        appState.currentUserRole = 'user';
        return 'user';
    }
};

const updateUIVisibilityBasedOnRole = (role, elements) => {
    const { mainTabPaper, mainTabOverall, paperFinanceContent, overallMappingContent, formSection } = elements;

    logDebug(Updating UI for role: ${role});

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
        }
    }
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

    logDebug(Switching to tab: ${tabName}, Current role: ${appState.currentUserRole});

    mainTabPaper.classList.remove('active');
    mainTabOverall?.classList.remove('active');
    paperFinanceContent.classList.add('hidden');
    overallMappingContent?.classList.add('hidden');
    formSection.classList.add('hidden');

    logDebug(Clearing all table bodies: mappingTableBody, pinelabsTableBody, overallMainMappingTableBody, overallPinelabsTableBody);
    mappingTableBody.innerHTML = '<tr class="skeleton-row"><td colspan="10"></td></tr><tr class="skeleton-row"><td colspan="10"></td></tr><tr class="skeleton-row"><td colspan="10"></td></tr>';
    pinelabsTableBody.innerHTML = '<tr class="skeleton-row"><td colspan="9"></td></tr><tr class="skeleton-row"><td colspan="9"></td></tr><tr class="skeleton-row"><td colspan="9"></td></tr>';
    if (overallMainMappingTableBody) {
        overallMainMappingTableBody.innerHTML = '';
        logDebug(Cleared overallMainMappingTableBody);
    }
    if (overallPinelabsTableBody) {
        overallPinelabsTableBody.innerHTML = '';
        logDebug(Cleared overallPinelabsTableBody);
    }

    try {
        if (tabName === 'paper') {
            logDebug(Activating paper tab);
            mainTabPaper.classList.add('active');
            paperFinanceContent.classList.remove('hidden');
            formSection.classList.remove('hidden');
            formSection.style.display = 'block';
            logDebug('Displaying Paper tab with form and user-specific tables');

            // Ensure overall content is hidden and stray tables removed for non-admins
            if (appState.currentUserRole !== 'admin' && overallMappingContent) {
                overallMappingContent.classList.add('hidden');
                overallMappingContent.style.display = 'none !important';
                logDebug(Hiding overallMappingContent for non-admin, current display: ${window.getComputedStyle(overallMappingContent).display});
                // Remove or hide stray tables
                const mainTable = document.querySelector('#overall-main-mapping-table-body')?.closest('table');
                const pinelabsTable = document.querySelector('#overall-pinelabs-table-body')?.closest('table');
                if (mainTable) {
                    logDebug(Main table parent: ${mainTable.parentElement.id || 'body'});
                    if (!mainTable.closest('#overall-mapping-content')) {
                        mainTable.remove(); // Remove stray table
                        logDebug('Removed stray overall-main-mapping-table outside overallMappingContent');
                    } else {
                        mainTable.style.display = 'none';
                    }
                }
                if (pinelabsTable) {
                    logDebug(Pinelabs table parent: ${pinelabsTable.parentElement.id || 'body'});
                    if (!pinelabsTable.closest('#overall-mapping-content')) {
                        pinelabsTable.remove(); // Remove stray table
                        logDebug('Removed stray overall-pinelabs-table outside overallMappingContent');
                    } else {
                        pinelabsTable.style.display = 'none';
                    }
                }
            }

            // Load only user-specific data
            logDebug(Loading user-specific data for paper tab);
            await Promise.all([
                loadMappings(elements),
                loadUserPinelabsDetails(elements)
            ]);
            logDebug(User-specific data loaded for paper tab);
        } else if (tabName === 'overall' && appState.currentUserRole === 'admin') {
            logDebug(Activating overall tab for admin);
            if (mainTabOverall && overallMappingContent) {
                mainTabOverall.classList.add('active');
                overallMappingContent.classList.remove('hidden');
                logDebug('Displaying Overall tab with admin tables');
                formSection.classList.add('hidden');
                logDebug(Hiding formSection for overall tab);

                logDebug(Loading overall data for admin);
                await Promise.all([
                    loadOverallMainMappings(elements),
                    loadOverallPinelabsDetails(false, elements)
                ]);
                logDebug(Overall data loaded for admin);
            } else {
                logDebug('Missing overall tab elements for admin');
                window.showToast('Application error: Missing admin UI elements', 'error');
            }
        } else if (tabName === 'overall' && appState.currentUserRole !== 'admin') {
            logDebug(Non-admin attempting overall tab, reverting to paper tab);
            mainTabPaper.classList.add('active');
            paperFinanceContent.classList.remove('hidden');
            formSection.classList.remove('hidden');
            formSection.style.display = 'block';
            if (overallMappingContent) overallMappingContent.classList.add('hidden');
            logDebug('Non-admin reverted to paper tab');
            window.showToast('Access to Overall Mapping is restricted to admins', 'error');

            logDebug(Loading user-specific data for reverted paper tab);
            await Promise.all([
                loadMappings(elements),
                loadUserPinelabsDetails(elements)
            ]);
            logDebug(User-specific data loaded for reverted paper tab);
        }
    } catch (error) {
        logDebug(Error switching tab: ${error.message});
        window.showToast(Failed to load ${tabName} tab data, 'error');
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
        logDebug(Switching to sub-tab: ${tabName});

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

        logDebug(Active sub-tab set to: ${activeTabInput.value});
    };

    financierTab.addEventListener('click', () => switchSubTab('financier'));
    pinelabsTab.addEventListener('click', () => switchSubTab('pinelabs'));

    // Initialize with the default sub-tab
    switchSubTab(activeTabInput.value || 'financier');
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
        logDebug(Error loading mappings: ${error.message});
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
        logDebug(Error loading Pine Labs details: ${error.message});
        window.showToast('Failed to load Pine Labs details', 'error');
        elements.pinelabsTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No data available</td></tr>';
        return [];
    }
};

const loadOverallMainMappings = async (elements, page = 1, pageSize = 50) => {
    try {
        logDebug(Starting loadOverallMainMappings with page: ${page}, pageSize: ${pageSize});
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
            logDebug(Populated overallMainMappingTableBody with ${data.length} records);
        }
        return data;
    } catch (error) {
        logDebug(Error loading overall main mappings: ${error.message});
        window.showToast('Failed to load overall main mappings', 'error');
        return [];
    }
};

const loadOverallPinelabsDetails = async (lazy = false, elements) => {
    try {
        logDebug(Starting loadOverallPinelabsDetails, lazy: ${lazy});
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
            logDebug(Populated overallPinelabsTableBody with ${data.length} records);
        }
        return data;
    } catch (error) {
        logDebug(Error loading overall Pine Labs details: ${error.message});
        window.showToast('Failed to load overall Pine Labs details', 'error');
        return [];
    }
};

const insertMapping = async (data, pinelabsEntries) => {
    try {
        logDebug(Attempting to insert mapping, current hasSubmittedInSession: ${appState.hasSubmittedInSession});
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('No user found');
        
        const mappingData = { ...data, user_id: user.id };
        
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
        logDebug(Mapping inserted successfully, ID: ${mapping.id}, hasSubmittedInSession: ${appState.hasSubmittedInSession});
        
        await refreshOverallTables(elements);
        return mapping.id;
    } catch (error) {
        logDebug(Error inserting mapping: ${error.message});
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
        
        await refreshOverallTables(elements);
        window.showToast('Mapping deleted successfully', 'success');
    } catch (error) {
        logDebug(Error deleting mapping: ${error.message});
        window.showToast('Failed to delete mapping', 'error');
    }
};

// Refresh Tables
const refreshOverallTables = async (elements) => {
    const activeTab = document.querySelector('.main-tab.active')?.id === 'main-tab-overall' ? 'overall' : 'paper';
    logDebug(Refreshing tables for active tab: ${activeTab});

    try {
        if (activeTab === 'paper') {
            logDebug(Refreshing paper tab tables);
            await Promise.all([
                loadMappings(elements),
                loadUserPinelabsDetails(elements)
            ]);
        } else if (activeTab === 'overall' && appState.currentUserRole === 'admin') {
            logDebug(Refreshing overall tab tables for admin);
            await Promise.all([
                loadOverallMainMappings(elements),
                loadOverallPinelabsDetails(true, elements)
            ]);
        }
    } catch (error) {
        logDebug(Error refreshing tables: ${error.message});
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
    confirmLogout.addEventListener('click', e => window.handleLogout(e));
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
        logDebug(Logout dropdown toggled, active: ${!isActive});
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
    try {
        logDebug(Initiating logout, hasSubmittedInSession: ${appState.hasSubmittedInSession});
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;

        if (appState.hasSubmittedInSession) {
            logDebug('Showing notification for submitted session');
            const notification = document.createElement('div');
            notification.textContent = 'The mapping will be done within 5 working days';
            notification.classList.add('logout-notification');
            document.body.appendChild(notification);
            logDebug('Notification created and appended to DOM');
            
            setTimeout(() => {
                notification.classList.add('fade-out');
                logDebug('Notification fade-out started');
                setTimeout(() => {
                    notification.remove();
                    window.location.href = 'login.html';
                    logDebug('Redirecting to login.html');
                }, 500);
            }, 2000);
        } else {
            logDebug('No notification shown, redirecting to login.html');
            window.location.href = 'login.html';
        }
    } catch (error) {
        logDebug(Logout error: ${error.message});
        window.showToast('Logout failed', 'error');
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

        // Ensure sub-tab listeners are set up
        setupSubTabListeners();

        await switchMainTab('paper', elements); // Default to paper tab with user-specific content

        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
        logDebug('Page initialization completed');
    } catch (error) {
        logDebug(Initialization error: ${error.message});
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
