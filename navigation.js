// State management
const appState = {
    currentUserRole: null,
    currentOverallMainMappingsData: [],
    currentOverallPinelabsData: [],
    filteredOverallMainMappingsForExcel: [],
};

// DOM elements
const elements = {
    mainTabPaper: document.getElementById('main-tab-paper'),
    mainTabOverall: document.getElementById('main-tab-overall'),
    paperFinanceContent: document.getElementById('paper-finance-content'),
    overallMappingContent: document.getElementById('overall-mapping-content'),
    overallMainMappingsSearchInput: document.getElementById('overallMainMappingsSearch'),
    overallMainMappingsBrandFilter: document.getElementById('overallMainMappingsBrandFilter'),
    overallPinelabsSearchInput: document.getElementById('overallPinelabsSearch'),
    overallPinelabsBrandFilter: document.getElementById('overallPinelabsBrandFilter'),
    downloadOverallMainExcelBtn: document.getElementById('download-overall-main-excel'),
    downloadOverallPinelabsExcelBtn: document.getElementById('download-overall-pinelabs-excel'),
    mappingForm: document.getElementById('mapping-form'),
    formSection: document.getElementById('form-section'),
    loadingMessage: document.getElementById('loading-message'), // Assumes a <div id="loading-message"> for dynamic loading text
};

// Utility: Debounce function
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

// Update loading message
const updateLoadingMessage = (message) => {
    if (elements.loadingMessage) {
        elements.loadingMessage.textContent = message;
    }
};

// Check user role (cached with localStorage)
const checkUserRole = async () => {
    const cachedRole = localStorage.getItem('userRole');
    if (cachedRole && cachedRole !== 'error') {
        appState.currentUserRole = cachedRole;
        return cachedRole;
    }

    updateLoadingMessage('Checking user role...');
    try {
        const { data, error: authError } = await window.supabaseClient.auth.getUser();
        if (authError) throw new Error('Auth error: ' + authError.message);
        const user = data?.user;
        if (!user) throw new Error('User not authenticated.');

        const { data: userData, error: roleError } = await window.supabaseClient
            .from('user_stores')
            .select('role')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (roleError && roleError.code !== 'PGRST116') {
            console.warn('Role fetch error:', roleError.message);
        }
        appState.currentUserRole = userData?.role || 'user';
        localStorage.setItem('userRole', appState.currentUserRole);
    } catch (err) {
        window.showToast('Error verifying role: ' + err.message, 'error');
        appState.currentUserRole = 'error';
        localStorage.setItem('userRole', 'error');
    }
    return appState.currentUserRole;
};

// Switch main tab (render UI immediately, load data in background)
const switchMainTab = async (tabName) => {
    const userRole = appState.currentUserRole; // Already cached
    document.querySelectorAll('.main-tab').forEach(tab => tab.classList.remove('active'));
    [elements.paperFinanceContent, elements.overallMappingContent].forEach(el => el?.classList.add('hidden'));

    if (userRole !== 'admin' && tabName === 'overall') {
        window.showToast('Permission denied for this tab.', 'error');
        elements.mainTabPaper?.classList.add('active');
        elements.paperFinanceContent?.classList.remove('hidden');
        elements.mainTabOverall.style.display = 'none';
        elements.formSection.style.display = 'block';
        return;
    }

    if (userRole !== 'admin') {
        elements.mainTabOverall.style.display = 'none';
    } else {
        elements.mainTabOverall.style.display = '';
    }

    if (tabName === 'paper') {
        elements.mainTabPaper?.classList.add('active');
        elements.paperFinanceContent?.classList.remove('hidden');
        elements.formSection.style.display = 'block';
        if (typeof window.loadMappings === 'function') {
            updateLoadingMessage('Loading Paper Finance data...');
            window.loadMappings();
        } else {
            window.showToast('Paper Finance features unavailable.', 'error');
        }
    } else if (tabName === 'overall') {
        elements.mainTabOverall?.classList.add('active');
        elements.overallMappingContent?.classList.remove('hidden');
        elements.formSection.style.display = 'none';
        // Load data in background without blocking UI
        updateLoadingMessage('Loading Overall data...');
        Promise.all([
            loadOverallMainMappings(),
            loadOverallPinelabsDetails(true), // Lazy-load Pine Labs details
        ]).catch(err => window.showToast('Error loading data: ' + err.message, 'error'));
    }
};

// Populate main mappings table (incremental rendering for large datasets)
const populateOverallMainMappingsTable = async (mappingsToDisplay, userRole) => {
    const tableBody = document.getElementById('overall-main-mapping-table-body');
    if (!tableBody) return;

    ['overall-main-mapping-table-body-initial-loading', 'overall-main-mapping-table-body-no-data', 'overall-main-mapping-table-body-no-data-filter']
        .forEach(id => document.getElementById(id)?.remove());
    tableBody.innerHTML = '';

    const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
    appState.filteredOverallMainMappingsForExcel = mappingsToDisplay || [];

    if (mappingsToDisplay?.length > 0) {
        const batchSize = 50; // Render 50 rows at a time to avoid blocking
        for (let i = 0; i < mappingsToDisplay.length; i += batchSize) {
            const batch = mappingsToDisplay.slice(i, i + batchSize);
            batch.forEach(row => {
                const tr = tableBody.insertRow();
                let financierDisplay = row.financier || '-';
                let financierCodeDisplay = '-';
                const requestedDateDisplay = row.requested_date ? new Date(row.requested_date).toLocaleDateString() : '-';
                const isPurePineLabsMapping = (!row.financier && row.pinelabs_details?.length > 0);

                if (row.financier) {
                    if (typeof row.financier_code === 'object') {
                        const financierKey = row.financier.toLowerCase().replace(/ /g, '_');
                        financierCodeDisplay = row.financier_code[financierKey] || '-';
                    } else if (typeof row.financier_code === 'string') {
                        financierCodeDisplay = row.financier_code || '-';
                    }
                } else if (isPurePineLabsMapping) {
                    financierDisplay = 'Pine Labs';
                }

                const showActions = userRole === 'admin' || (user && row.user_id === user.id);
                const actionsHtml = showActions ? `
                    <button class="btn btn-icon-only btn-edit-icon" onclick="window.editMappingOverall(${row.id})" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button class="btn btn-icon-only btn-delete-icon" onclick="window.deleteOverallMainMapping(${row.id})" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                ` : '-';

                tr.innerHTML = <td class="table-id-column">${row.id}</td><td>${row.store_name || '-'}</td><td>${row.state || '-'}</td><td>${row.asm || '-'}</td><td>${row.mail_id || '-'}</td><td data-brand="${row.brand || ''}">${row.brand || '-'}</td><td>${row.brand === 'Apple' ? (row.brand_code || '-') : '-'}</td><td>${financierDisplay}</td><td>${financierCodeDisplay}</td><td>${row.requested_by || '-'}</td><td class="table-date-column">${requestedDateDisplay}</td><td class="table-actions-column"><div class="action-buttons">${actionsHtml}</div></td>;
            });
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield to browser for rendering
        }
    } else {
        const colSpan = tableBody.parentElement?.tHead?.rows[0]?.cells.length || 12;
        tableBody.innerHTML = <tr id="overall-main-mapping-table-body-no-data-filter"><td colspan="${colSpan}" class="empty-state">No matching overall main mapping requests found.</td></tr>;
    }
};

// Load main mappings (with pagination)
const loadOverallMainMappings = async (page = 1, pageSize = 50) => {
    const tableBody = document.getElementById('overall-main-mapping-table-body');
    if (!tableBody) {
        window.showToast('Main mapping table not found.', 'error');
        return;
    }

    tableBody.innerHTML = <tr id="overall-main-mapping-table-body-initial-loading"><td colspan="12" class="loading text-center">Loading...</td></tr>;

    try {
        const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('Please log in.');

        let query = window.supabaseClient
            .from('finance_mappings')
            .select('id, store_name, state, asm, mail_id, brand, brand_code, financier, financier_code, requested_by, requested_date, user_id, pinelabs_details!pinelabs_details_mapping_id_fkey(*)', { count: 'exact' })
            .order('id', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1); // Paginate

        const userRole = appState.currentUserRole;
        if (userRole !== 'admin') {
            query = query.eq('user_id', user.id);
        }

        const { data: mappings, count, error } = await query;
        if (error) throw new Error(error.message.includes('policy') ? 'Permission denied.' : error.message);

        appState.currentOverallMainMappingsData = mappings || [];
        await applyOverallMainMappingsFilters();

        // Optionally add pagination controls if count > pageSize
        if (count > pageSize) {
            console.log(Total mappings: ${count}. Add pagination controls for page ${page}.);
        }
    } catch (err) {
        window.showToast('Error loading mappings: ' + err.message, 'error');
        tableBody.innerHTML = <tr><td colspan="12" class="empty-state">Error loading.</td></tr>;
    }
};

// Apply main mappings filters
const applyOverallMainMappingsFilters = async () => {
    const searchTerm = elements.overallMainMappingsSearchInput.value.toLowerCase();
    const brandFilter = elements.overallMainMappingsBrandFilter.value;
    const userRole = appState.currentUserRole;

    const filteredData = appState.currentOverallMainMappingsData.filter(row => {
        const isPurePineLabsMapping = (!row.financier && row.pinelabs_details?.length > 0);
        if (!isPurePineLabsMapping || userRole === 'admin') {
            let financierSearchValue = row.financier || '';
            if (isPurePineLabsMapping && userRole === 'admin') financierSearchValue = 'Pine Labs';

            return (searchTerm === '' ||
                row.store_name?.toLowerCase().includes(searchTerm) ||
                row.state?.toLowerCase().includes(searchTerm) ||
                row.asm?.toLowerCase().includes(searchTerm) ||
                row.mail_id?.toLowerCase().includes(searchTerm) ||
                row.brand?.toLowerCase().includes(searchTerm) ||
                financierSearchValue.toLowerCase().includes(searchTerm) ||
                row.requested_by?.toLowerCase().includes(searchTerm) ||
                row.id?.toString().includes(searchTerm) ||
                (row.requested_date && new Date(row.requested_date).toLocaleDateString().includes(searchTerm))) &&
                (brandFilter === '' || row.brand === brandFilter);
        }
        return false;
    });

    await populateOverallMainMappingsTable(filteredData, userRole);
};

// Load Pine Labs details (lazy-loaded if specified)
const loadOverallPinelabsDetails = async (lazy = false) => {
    if (lazy) {
        // Defer loading until user interaction (e.g., clicking a "Load Pine Labs Details" button)
        const tableBody = document.getElementById('overall-pinelabs-table-body');
        if (tableBody) {
            tableBody.innerHTML = <tr id="overall-pinelabs-table-body-initial-loading"><td colspan="9" class="loading text-center">Pine Labs details will load on demand.</td></tr>;
        }
        return;
    }

    const tableBody = document.getElementById('overall-pinelabs-table-body');
    if (!tableBody) {
        window.showToast('Pine Labs table not found.', 'error');
        return;
    }

    tableBody.innerHTML = <tr id="overall-pinelabs-table-body-initial-loading"><td colspan="9" class="loading text-center">Loading...</td></tr>;

    try {
        const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('Please log in.');

        let pinelabsQuery = window.supabaseClient
            .from('pinelabs_details')
            .select('id, mapping_id, pos_id, tid, serial_no, store_id', { count: 'exact' })
            .order('mapping_id', { ascending: false })
            .range(0, 49); // Paginate: first 50 rows

        const userRole = appState.currentUserRole;
        let userMappingIds = [];
        if (userRole !== 'admin') {
            const { data: userMappings, error } = await window.supabaseClient
                .from('finance_mappings')
                .select('id')
                .eq('user_id', user.id);
            if (error) console.warn('Error fetching user mappings:', error.message);
            userMappingIds = userMappings?.map(m => m.id) || [];
            if (userMappingIds.length === 0) {
                tableBody.innerHTML = <tr id="overall-pinelabs-table-body-no-data"><td colspan="9" class="empty-state">No Pine Labs details.</td></tr>;
                await applyOverallPinelabsFilters();
                return;
            }
            pinelabsQuery = pinelabsQuery.in('mapping_id', userMappingIds);
        }

        const { data: rawPinelabsDetails, count, error } = await pinelabsQuery;
        if (error) throw new Error(error.message);

        const mappingIds = [...new Set(rawPinelabsDetails.map(d => d.mapping_id).filter(Boolean))];
        let financeMappingsData = [];
        if (mappingIds.length > 0) {
            const { data: mappings, error: mapError } = await window.supabaseClient
                .from('finance_mappings')
                .select('id, store_name, brand')
                .in('id', mappingIds);
            if (mapError) console.warn('Error fetching mappings:', mapError.message);
            financeMappingsData = mappings || [];
        }

        const mappingsMap = new Map(financeMappingsData.map(m => [m.id, m]));
        appState.currentOverallPinelabsData = rawPinelabsDetails.map(pl => ({
            ...pl,
            finance_mappings: mappingsMap.get(pl.mapping_id) || null,
        }));

        await applyOverallPinelabsFilters();
    } catch (err) {
        window.showToast('Error loading Pine Labs: ' + err.message, 'error');
        tableBody.innerHTML = <tr><td colspan="9" class="empty-state">Error loading.</td></tr>;
    }
};

// Apply Pine Labs filters
const applyOverallPinelabsFilters = async () => {
    const tableBody = document.getElementById('overall-pinelabs-table-body');
    const searchTerm = elements.overallPinelabsSearchInput.value.toLowerCase();
    const brandFilter = elements.overallPinelabsBrandFilter.value;
    const userRole = appState.currentUserRole;

    const filteredData = appState.currentOverallPinelabsData.filter(pl => {
        return (searchTerm === '' ||
            pl.pos_id?.toLowerCase().includes(searchTerm) ||
            pl.tid?.toLowerCase().includes(searchTerm) ||
            pl.serial_no?.toLowerCase().includes(searchTerm) ||
            pl.store_id?.toLowerCase().includes(searchTerm) ||
            pl.mapping_id?.toString().includes(searchTerm) ||
            pl.id?.toString().includes(searchTerm) ||
            pl.finance_mappings?.store_name?.toLowerCase().includes(searchTerm)) &&
            (brandFilter === '' || pl.finance_mappings?.brand === brandFilter);
    });

    if (typeof window.populatePinelabsTable === 'function') {
        window.populatePinelabsTable(tableBody, filteredData, { editable: true, isAdminView: userRole === 'admin' });
    }

    const actualDisplayedRows = tableBody.querySelectorAll('tr:not([id^="overall-pinelabs-table-body-"])').length;
    const colSpan = tableBody.parentElement?.tHead?.rows[0]?.cells.length || 9;
    const existingNoDataFilter = document.getElementById('overall-pinelabs-table-body-no-data-filter');

    if (actualDisplayedRows === 0 && !existingNoDataFilter) {
        tableBody.innerHTML = <tr id="overall-pinelabs-table-body-no-data-filter"><td colspan="${colSpan}" class="empty-state">No matching Pine Labs details found.</td></tr>;
    } else if (existingNoDataFilter && actualDisplayedRows > 0) {
        existingNoDataFilter.remove();
    }
};

// Delete main mapping
const deleteOverallMainMapping = async (id) => {
    if (!confirm('Delete this mapping and its Pine Labs details?')) return;
    try {
        await window.supabaseClient.from('pinelabs_details').delete().eq('mapping_id', id);
        await window.supabaseClient.from('finance_mappings').delete().eq('id', id);
        window.showToast('Mapping deleted!', 'success');
        await refreshOverallTables();
        if (elements.mainTabPaper?.classList.contains('active') && typeof window.loadMappings === 'function') {
            await window.loadMappings();
        }
    } catch (err) {
        window.showToast('Error deleting: ' + err.message, 'error');
    }
};

// Prepare Excel data
const prepareOverallExcelData = (mainMappings) => {
    return mainMappings.map(m => {
        let financierExcelDisplay = m.financier || '-';
        let financierCode = '-';
        if (m.financier) {
            if (typeof m.financier_code === 'object') {
                const financierKey = m.financier.toLowerCase().replace(/ /g, '_');
                financierCode = m.financier_code[financierKey] || '-';
            }
        } else if (!m.financier && m.pinelabs_details?.length > 0) {
            financierExcelDisplay = 'Pine Labs';
        }

        const requestedDateExcel = m.requested_date ? new Date(m.requested_date).toLocaleDateString() : '-';
        const pinelabsString = m.pinelabs_details?.map(p => POS:${p.pos_id || 'N/A'},TID:${p.tid || 'N/A'},SNo:${p.serial_no || 'N/A'},StoreID:${p.store_id || 'N/A'}).join('; ') || '-';

        return {
            ID: m.id,
            SN: m.store_name || '-',
            ST: m.state || '-',
            ASM: m.asm || '-',
            Mail: m.mail_id || '-',
            Brand: m.brand || '-',
            BCode: m.brand === 'Apple' ? (m.brand_code || '-') : '-',
            Fin: financierExcelDisplay,
            FCode: financierCode,
            'Req. By': m.requested_by || '-',
            Date: requestedDateExcel,
            PLDetails: pinelabsString,
        };
    });
};

// Refresh tables
const refreshOverallTables = async () => {
    if (elements.mainTabOverall?.classList.contains('active')) {
        await Promise.all([
            loadOverallMainMappings(),
            loadOverallPinelabsDetails(),
        ]);
    }
};

// Form submission
const handleFormSubmission = async (event) => {
    event.preventDefault();
    try {
        const formData = new FormData(elements.mappingForm);
        const data = {
            store_name: formData.get('store_name'),
            state: formData.get('state'),
            asm: formData.get('asm'),
            mail_id: formData.get('mail_id'),
            brand: formData.get('brand'),
            brand_code: formData.get('brand_code'),
            financier: formData.get('financier'),
            financier_code: formData.get('financier_code'),
            requested_by: formData.get('requested_by'),
            requested_date: new Date().toISOString(),
            user_id: (await window.supabaseClient.auth.getUser()).data.user?.id,
        };

        if (!data.store_name || !data.brand) {
            window.showToast('Store name and brand are required.', 'error');
            return;
        }

        const { error } = await window.supabaseClient.from('finance_mappings').insert([data]);
        if (error) throw new Error(error.message);

        window.showToast('Mapping submitted!', 'success');
        elements.formSection.style.display = 'none';
        elements.mappingForm.reset();

        if (elements.mainTabPaper?.classList.contains('active') && typeof window.loadMappings === 'function') {
            await window.loadMappings();
        } else {
            await refreshOverallTables();
        }
    } catch (err) {
        window.showToast('Error submitting form: ' + err.message, 'error');
    }
};

// Initialize page (render UI first, load data in background)
const initializePage = async () => {
    const userRole = await checkUserRole();
    elements.formSection.style.display = userRole === 'admin' ? 'none' : 'block';

    // Hide loading screen and show main UI
    const loadingScreen = document.getElementById('loading-screen'); // Assumes a <div id="loading-screen">
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    const mainContent = document.getElementById('main-content'); // Assumes a <div id="main-content"> for main UI
    if (mainContent) {
        mainContent.style.display = 'block';
    }

    await switchMainTab(userRole === 'admin' ? 'overall' : 'paper');
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Tab clicks
    elements.mainTabPaper?.addEventListener('click', () => switchMainTab('paper'));
    elements.mainTabOverall?.addEventListener('click', () => switchMainTab('overall'));

    // Form submission
    elements.mappingForm?.addEventListener('submit', handleFormSubmission);

    // Debounced filters
    elements.overallMainMappingsSearchInput?.addEventListener('input', debounce(applyOverallMainMappingsFilters, 300));
    elements.overallMainMappingsBrandFilter?.addEventListener('change', applyOverallMainMappingsFilters);
    elements.overallPinelabsSearchInput?.addEventListener('input', debounce(applyOverallPinelabsFilters, 300));
    elements.overallPinelabsBrandFilter?.addEventListener('change', applyOverallPinelabsFilters);

    // Excel exports
    if (elements.downloadOverallMainExcelBtn && typeof XLSX !== 'undefined') {
        elements.downloadOverallMainExcelBtn.addEventListener('click', async () => {
            try {
                const dataToExport = appState.filteredOverallMainMappingsForExcel;
                if (!dataToExport.length) {
                    window.showToast('No data to export.', 'info');
                    return;
                }
                const exportData = prepareOverallExcelData(dataToExport);
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Overall Mappings');
                XLSX.writeFile(wb, Overall_Mappings_${new Date().toISOString().split('T')[0]}.xlsx);
            } catch (err) {
                window.showToast('Excel export error: ' + err.message, 'error');
            }
        });
    }

    if (elements.downloadOverallPinelabsExcelBtn && typeof XLSX !== 'undefined') {
        elements.downloadOverallPinelabsExcelBtn.addEventListener('click', async () => {
            try {
                const searchTerm = elements.overallPinelabsSearchInput.value.toLowerCase();
                const brandFilter = elements.overallPinelabsBrandFilter.value;
                const exportablePinelabsData = appState.currentOverallPinelabsData.filter(pl => {
                    return (searchTerm === '' ||
                        pl.pos_id?.toLowerCase().includes(searchTerm) ||
                        pl.tid?.toLowerCase().includes(searchTerm) ||
                        pl.serial_no?.toLowerCase().includes(searchTerm) ||
                        pl.store_id?.toLowerCase().includes(searchTerm) ||
                        pl.mapping_id?.toString().includes(searchTerm) ||
                        pl.id?.toString().includes(searchTerm) ||
                        pl.finance_mappings?.store_name?.toLowerCase().includes(searchTerm)) &&
                        (brandFilter === '' || pl.finance_mappings?.brand === brandFilter);
                });

                if (!exportablePinelabsData.length) {
                    window.showToast('No Pine Labs data to export.', 'info');
                    return;
                }

                const exportData = exportablePinelabsData.map(pl => ({
                    PL_ID: pl.id,
                    MapID: pl.mapping_id || 'N/A',
                    Store: pl.finance_mappings?.store_name || 'N/A',
                    Brand: pl.finance_mappings?.brand || 'N/A',
                    POS: pl.pos_id || '-',
                    TID: pl.tid || '-',
                    SNo: pl.serial_no || '-',
                    StorePL: pl.store_id || '-',
                }));

                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Overall PineLabs');
                XLSX.writeFile(wb, Overall_PineLabs_${new Date().toISOString().split('T')[0]}.xlsx);
            } catch (err) {
                window.showToast('Excel export error: ' + err.message, 'error');
            }
        });
    }

    // Initialize page with timeout
    const loadingTimeout = setTimeout(() => {
        window.showToast('Loading is taking longer than expected. Please check your connection.', 'error');
    }, 10000); // 10 seconds timeout

    initializePage().then(() => clearTimeout(loadingTimeout)).catch(err => {
        clearTimeout(loadingTimeout);
        window.showToast('Initialization failed: ' + err.message, 'error');
    });
});
