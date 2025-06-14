const mainTabPaper = document.getElementById('main-tab-paper');
const mainTabOverall = document.getElementById('main-tab-overall');
const paperFinanceContent = document.getElementById('paper-finance-content');
const overallMappingContent = document.getElementById('overall-mapping-content');
const overallMainMappingsSearchInput = document.getElementById('overallMainMappingsSearch');
const overallMainMappingsBrandFilter = document.getElementById('overallMainMappingsBrandFilter');
const overallPinelabsSearchInput = document.getElementById('overallPinelabsSearch');
const overallPinelabsBrandFilter = document.getElementById('overallPinelabsBrandFilter');
const downloadOverallMainExcelBtn = document.getElementById('download-overall-main-excel');
const downloadOverallPinelabsExcelBtn = document.getElementById('download-overall-pinelabs-excel');

const mappingForm = document.getElementById('mapping-form');
const formSection = document.getElementById('form-section');

let currentUserRole = null;
window.currentOverallMainMappingsData = []; // Data for "Overall Main Mappings"
window.currentOverallPinelabsData = [];   // Data for "Overall Pine Labs Details"
window.filteredOverallMainMappingsForExcel = []; // Data for Excel download for Overall Main

window.checkUserRole = async () => {
    if (currentUserRole !== null && currentUserRole !== 'error') return currentUserRole;
    try {
        const { data, error: authErrorResult } = await window.supabaseClient.auth.getUser();
        const user = data?.user;

        if (authErrorResult) {
            console.error('Supabase Auth getUser error:', authErrorResult);
            throw authErrorResult;
        }
        if (!user) {
            throw new Error('User not authenticated.');
        }

        const { data: userData, error: roleError } = await window.supabaseClient
            .from('user_stores')
            .select('role')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (roleError && roleError.code !== 'PGRST116') {
            console.warn("Could not determine user role from 'user_stores':", roleError.message);
        }
        window.userRole = userData?.role || 'user';
        currentUserRole = window.userRole;
    } catch (err) {
        window.showToast('Error verifying user role: ' + err.message, 'error');
        window.userRole = 'error';
        currentUserRole = 'error';
    }
    return currentUserRole;
};

window.switchMainTab = async (tabName) => {
    document.querySelectorAll('.main-tab').forEach(tab => tab.classList.remove('active'));
    if (paperFinanceContent) paperFinanceContent.classList.add('hidden');
    if (overallMappingContent) overallMappingContent.classList.add('hidden');

    await window.checkUserRole();
    const userRole = await window.checkUserRole();

    if (userRole !== 'admin' && tabName === 'overall') {
        window.showToast("You do not have permission to view this tab.", "error");
         if (mainTabPaper) mainTabPaper.classList.add('active'); //Select the paper finance tab
        if (paperFinanceContent) paperFinanceContent.classList.remove('hidden'); //Show the content related paper finance
        mainTabOverall.style.display = 'none'; //Hide the overall button to avoid more clicking
        return;
    }

    if (userRole !== 'admin' && tabName === 'paper')
    {
          mainTabOverall.style.display = 'none';
    }

    if (tabName === 'paper') {
        if (mainTabPaper) mainTabPaper.classList.add('active');
        if (paperFinanceContent) paperFinanceContent.classList.remove('hidden');
        if (typeof window.loadMappings === 'function') {
            await window.loadMappings();
        } else {
            window.showToast("Paper Finance features are unavailable.", "error");
        }
    } else if (tabName === 'overall') {
        if (mainTabOverall) mainTabOverall.classList.add('active');
        if (overallMappingContent) overallMappingContent.classList.remove('hidden');
        if (typeof window.loadOverallMainMappings === 'function') await window.loadOverallMainMappings();
        if (typeof window.loadOverallPinelabsDetails === 'function') await window.loadOverallPinelabsDetails();
    }
};

if (mainTabPaper) mainTabPaper.addEventListener('click', () => {
    formSection.style.display = 'block'; // Show the form on paper tab click
    window.switchMainTab('paper');
});
if (mainTabOverall) mainTabOverall.addEventListener('click', () => window.switchMainTab('overall'));

window.populateOverallMainMappingsTable = async (mappingsToDisplay, userRole) => {
    const tableBody = document.getElementById('overall-main-mapping-table-body');
    if (!tableBody) return;

    ['overall-main-mapping-table-body-initial-loading', 'overall-main-mapping-table-body-no-data', 'overall-main-mapping-table-body-no-data-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    tableBody.innerHTML = '';

    const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();

    // Store the currently displayed (filtered) data for Excel export
    window.filteredOverallMainMappingsForExcel = mappingsToDisplay || [];

    if (mappingsToDisplay && mappingsToDisplay.length > 0) {
        mappingsToDisplay.forEach(row => {
            const tr = tableBody.insertRow();
            let financierDisplay = row.financier || '-';
            let financierCodeDisplay = '-';
            const requestedDateDisplay = row.requested_date ? new Date(row.requested_date).toLocaleDateString() : '-';

            const isPurePineLabsMapping = (row.financier === '' || row.financier === null) && row.pinelabs_details && row.pinelabs_details.length > 0;

            if (row.financier && row.financier !== '') {
                if (row.financier_code && typeof row.financier_code === 'object') {
                    const financierKey = row.financier.toLowerCase().replace(/ /g, '_');
                    financierCodeDisplay = row.financier_code[financierKey] || '-';
                } else if (typeof row.financier_code === 'string') {
                    financierCodeDisplay = row.financier_code || '-';
                }
            } else if (isPurePineLabsMapping) {
                financierDisplay = 'Pine Labs';
                financierCodeDisplay = '-';
            } else {
                financierDisplay = '-';
            }

            const showActions = userRole === 'admin' || (user && row.user_id === user.id);
            const actionsHtml = showActions ? `
                <button class="btn btn-icon-only btn-edit-icon" onclick="window.editMappingOverall(${row.id})" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                <button class="btn btn-icon-only btn-delete-icon" onclick="window.deleteOverallMainMapping(${row.id})" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            ` : '-';

            // FIX: Added Requested Date to innerHTML
            tr.innerHTML = `<td class="table-id-column">${row.id}</td><td>${row.store_name || '-'}</td><td>${row.state || '-'}</td><td>${row.asm || '-'}</td><td>${row.mail_id || '-'}</td><td data-brand="${row.brand || ''}">${row.brand || '-'}</td><td>${row.brand === 'Apple' ? (row.brand_code || '-') : '-'}</td><td>${financierDisplay}</td><td>${financierCodeDisplay}</td><td>${row.requested_by || '-'}</td><td class="table-date-column">${requestedDateDisplay}</td><td class="table-actions-column"><div class="action-buttons">${actionsHtml}</div></td>`;
        });
    } else {
        const colSpan = tableBody.parentElement?.tHead?.rows[0]?.cells.length || 12;
        tableBody.innerHTML = `<tr id="overall-main-mapping-table-body-no-data-filter"><td colspan="${colSpan}" class="empty-state">No matching overall main mapping requests found.</td></tr>`;
    }
};

window.loadOverallMainMappings = async () => {
    const tableBody = document.getElementById('overall-main-mapping-table-body');
    if (!tableBody) {
        window.showToast("Overall main mapping table not found in UI.", "error");
        return;
    }

    tableBody.innerHTML = `<tr id="overall-main-mapping-table-body-initial-loading"><td colspan="12" class="loading text-center">Loading overall main mappings...</td></tr>`;

    try {
        const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            tableBody.innerHTML = `<tr><td colspan="12" class="empty-state">Please log in to view mappings.</td></tr>`;
            return;
        }

        let query = window.supabaseClient
            .from('finance_mappings')
            .select('id, store_name, state, asm, mail_id, brand, brand_code, financier, financier_code, requested_by, requested_date, user_id, pinelabs_details!pinelabs_details_mapping_id_fkey(*)')
            .order('id', { ascending: false });

        const userRole = await window.checkUserRole();
        if (userRole !== 'admin') {
            query = query.eq('user_id', user.id);
        }

        const { data: mappings, error } = await query;

        if (error) {
            const userErr = (error.code === '42501' || error.message.includes('policy'))
                ? 'Permission denied. Check RLS policies.'
                : 'Error loading: ' + error.message;
            tableBody.innerHTML = `<tr><td colspan="12" class="empty-state">${userErr}</td></tr>`;
            window.showToast(userErr, 'error');
            return;
        }

        window.currentOverallMainMappingsData = mappings || [];
        await window.applyOverallMainMappingsFilters();

    } catch (err) {
        window.showToast('Error loading overall mappings: ' + err.message, 'error');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="12" class="empty-state">Error loading. Check console.</td></tr>`;
    }
};

window.applyOverallMainMappingsFilters = async () => {
    const searchTerm = overallMainMappingsSearchInput.value.toLowerCase();
    const brandFilter = overallMainMappingsBrandFilter.value;
    const userRole = await window.checkUserRole();

    const filteredData = window.currentOverallMainMappingsData.filter(row => {
        const isPurePineLabsMapping = (row.financier === '' || row.financier === null) && row.pinelabs_details && row.pinelabs_details.length > 0;
        if (!isPurePineLabsMapping || userRole === 'admin') {
            let financierSearchValue = row.financier || '';
            if (isPurePineLabsMapping && userRole === 'admin') {
                financierSearchValue = 'Pine Labs';
            }

            const matchesSearch = searchTerm === '' ||
                (row.store_name?.toLowerCase().includes(searchTerm)) ||
                (row.state?.toLowerCase().includes(searchTerm)) ||
                (row.asm?.toLowerCase().includes(searchTerm)) ||
                (row.mail_id?.toLowerCase().includes(searchTerm)) ||
                (row.brand?.toLowerCase().includes(searchTerm)) ||
                (financierSearchValue?.toLowerCase().includes(searchTerm)) ||
                (row.requested_by?.toLowerCase().includes(searchTerm)) ||
                (row.id?.toString().includes(searchTerm)) ||
                (row.requested_date ? new Date(row.requested_date).toLocaleDateString().includes(searchTerm) : false); // Search by displayed date

            const matchesBrand = brandFilter === '' || row.brand === brandFilter;
            return matchesSearch && matchesBrand;
        }
        return false;
    });

    await window.populateOverallMainMappingsTable(filteredData, userRole);
};

if (overallMainMappingsSearchInput) overallMainMappingsSearchInput.addEventListener('input', window.applyOverallMainMappingsFilters);
if (overallMainMappingsBrandFilter) overallMainMappingsBrandFilter.addEventListener('change', window.applyOverallMainMappingsFilters);

window.currentOverallPinelabsData = []; // Ensure initialized

window.loadOverallPinelabsDetails = async () => {
    const tableBody = document.getElementById('overall-pinelabs-table-body');
    if (!tableBody) {
        window.showToast("Overall Pine Labs table not found.", "error");
        return;
    }

    tableBody.innerHTML = `<tr id="overall-pinelabs-table-body-initial-loading"><td colspan="9" class="loading text-center">Loading...</td></tr>`;

    try {
        const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
        if (!user) {
            tableBody.innerHTML = `<tr><td colspan="9" class="empty-state">Please log in.</td></tr>`;
            return;
        }

        let pinelabsQuery = window.supabaseClient
            .from('pinelabs_details')
            .select(`id, mapping_id, pos_id, tid, serial_no, store_id`)
            .order('mapping_id', { ascending: false });

        const userRole = await window.checkUserRole();
        if (userRole !== 'admin') {
            const { data: userMappings, error: userMappingsError } = await window.supabaseClient
                .from('finance_mappings').select('id').eq('user_id', user.id);
            if (userMappingsError) console.warn("Error fetching user mapping IDs for PL filter:", userMappingsError.message);

            const userMappingIds = userMappings ? userMappings.map(m => m.id) : [];
            if (userMappingIds.length > 0) {
                pinelabsQuery = pinelabsQuery.in('mapping_id', userMappingIds);
            } else {
                tableBody.innerHTML = `<tr id="overall-pinelabs-table-body-no-data"><td colspan="9" class="empty-state">No Pine Labs details for your mappings.</td></tr>`;
                await window.applyOverallPinelabsFilters(); // Call filter to clear dynamic messages
                return;
            }
        }

        const { data: rawPinelabsDetails, error: pinelabsError } = await pinelabsQuery;
        if (pinelabsError) throw pinelabsError;

        const mappingIds = [...new Set(rawPinelabsDetails.map(d => d.mapping_id).filter(Boolean))];
        let financeMappingsData = [];
        if (mappingIds.length > 0) {
            const { data: mappings, error: mapError } = await window.supabaseClient.from('finance_mappings').select(`id, store_name, brand`).in('id', mappingIds);
            if (mapError) console.warn("Could not fetch store/brand for some PL details:", mapError.message);
            else financeMappingsData = mappings || [];
        }

        const mappingsMap = new Map(financeMappingsData.map(m => [m.id, m]));
        window.currentOverallPinelabsData = rawPinelabsDetails.map(pl => ({ ...pl, finance_mappings: mappingsMap.get(pl.mapping_id) || null }));

        await window.applyOverallPinelabsFilters();

    } catch (err) {
        window.showToast('Error loading Pine Labs: ' + err.message, 'error');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Error. Check console.</td></tr>';
    }
};

window.applyOverallPinelabsFilters = async () => {
    const tableBody = document.getElementById('overall-pinelabs-table-body');
    const searchTerm = overallPinelabsSearchInput.value.toLowerCase();
    const brandFilter = overallPinelabsBrandFilter.value;
    const userRole = await window.checkUserRole();

    const filteredData = window.currentOverallPinelabsData.filter(pl => {
        const matchesSearch = searchTerm === '' ||
            (pl.pos_id?.toLowerCase().includes(searchTerm)) ||
            (pl.tid?.toLowerCase().includes(searchTerm)) ||
            (pl.serial_no?.toLowerCase().includes(searchTerm)) ||
            (pl.store_id?.toLowerCase().includes(searchTerm)) ||
            (pl.mapping_id?.toString().includes(searchTerm)) ||
            (pl.id?.toString().includes(searchTerm)) ||
            (pl.finance_mappings?.store_name?.toLowerCase().includes(searchTerm));

        const matchesBrand = brandFilter === '' || pl.finance_mappings?.brand === brandFilter;
        return matchesSearch && matchesBrand;
    });

    if (typeof window.populatePinelabsTable === 'function') { // populatePinelabsTable is from pinelabs.js
        window.populatePinelabsTable(tableBody, filteredData, { editable: true, isAdminView: (userRole === 'admin') });
    }

    const actualDisplayedRows = tableBody.querySelectorAll('tr:not([id^="overall-pinelabs-table-body-"])').length;
    const colSpan = tableBody.parentElement?.tHead?.rows[0]?.cells.length || 9;
    const existingNoDataFilter = document.getElementById('overall-pinelabs-table-body-no-data-filter');

    if (actualDisplayedRows === 0) {
        if (!existingNoDataFilter) {
            const tr = document.createElement('tr');
            tr.id = 'overall-pinelabs-table-body-no-data-filter';
            tr.innerHTML = `<td colspan="${colSpan}" class="empty-state">No matching overall Pine Labs details found.</td>`;
            tableBody.appendChild(tr);
        } else {
            existingNoDataFilter.style.display = '';
        }
    } else {
        if (existingNoDataFilter) existingNoDataFilter.remove();
    }
};

if (overallPinelabsSearchInput) overallPinelabsSearchInput.addEventListener('input', window.applyOverallPinelabsFilters);
if (overallPinelabsBrandFilter) overallPinelabsBrandFilter.addEventListener('change', window.applyOverallPinelabsFilters);

window.deleteOverallMainMapping = async (id) => {
    if (!confirm('Delete this mapping and all its Pine Labs details?')) return;
    try {
        await window.supabaseClient.from('pinelabs_details').delete().eq('mapping_id', id);
        await window.supabaseClient.from('finance_mappings').delete().eq('id', id);
        window.showToast('Mapping deleted!', 'success');
        await window.loadOverallMainMappings();
        await window.loadOverallPinelabsDetails();
        if (mainTabPaper && mainTabPaper.classList.contains('active') && typeof window.loadMappings === 'function') {
            await window.loadMappings();
        }
    } catch (err) {
        window.showToast('Error deleting: ' + err.message, 'error');
    }
};

const prepareOverallExcelData = (mainMappings) => { // Changed to use filtered data
    return mainMappings.map(m => {
        let financierExcelDisplay = m.financier || '-';
        let financierCode = '-';
        if (m.financier && m.financier !== '') {
            if (m.financier_code && typeof m.financier_code === 'object') {
                const financierKey = m.financier.toLowerCase().replace(/ /g, '_');
                financierCode = m.financier_code[financierKey] || '-';
            }
        } else if ((m.financier === '' || m.financier === null) && m.pinelabs_details && m.pinelabs_details.length > 0) {
            financierExcelDisplay = 'Pine Labs';
        }

        const requestedDateExcel = m.requested_date ? new Date(m.requested_date).toLocaleDateString() : '-';

        const pinelabsString = m.pinelabs_details?.map(p => `POS:${p.pos_id || 'N/A'},TID:${p.tid || 'N/A'},SNo:${p.serial_no || 'N/A'},StoreID:${p.store_id || 'N/A'}`).join('; ') || '-';
        return {
            ID: m.id, SN: m.store_name || '-', ST: m.state || '-', ASM: m.asm || '-', Mail: m.mail_id || '-', Brand: m.brand || '-', BCode: m.brand === 'Apple' ? (m.brand_code || '-') : '-',
            Fin: financierExcelDisplay, FCode: financierCode, 'Req. By': m.requested_by || '-', Date: requestedDateExcel, PLDetails: pinelabsString
        };
    });
};

if (downloadOverallMainExcelBtn) downloadOverallMainExcelBtn.addEventListener('click', async () => {
    try {
        if (typeof XLSX === 'undefined') throw new Error('Excel lib not loaded.');

        // Use window.filteredOverallMainMappingsForExcel (populated by populateOverallMainMappingsTable)
        const dataToExport = window.filteredOverallMainMappingsForExcel || [];

        if (dataToExport.length === 0) {
            window.showToast('No data to export based on current filters.', 'info');
            return;
        }

        const exportData = prepareOverallExcelData(dataToExport); // Prepare this filtered data

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Overall Mappings");
        XLSX.writeFile(wb, `Overall_Mappings_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    catch (err) {
        window.showToast('Excel export error: ' + err.message, 'error');
    }
});

if (downloadOverallPinelabsExcelBtn) downloadOverallPinelabsExcelBtn.addEventListener('click', async () => {
    try {
        if (typeof XLSX === 'undefined') throw new Error('Excel lib not loaded.');
        // For Pine Labs Excel, we directly use the currentOverallPinelabsData after applying filters on UI.
        // The display is already filtered. We can grab current DOM rows or re-filter for export explicitly
        const tableBody = document.getElementById('overall-pinelabs-table-body');
        const searchTerm = overallPinelabsSearchInput.value.toLowerCase();
        const brandFilter = overallPinelabsBrandFilter.value;

        const exportablePinelabsData = window.currentOverallPinelabsData.filter(pl => {
            const matchesSearch = searchTerm === '' ||
                (pl.pos_id?.toLowerCase().includes(searchTerm)) ||
                (pl.tid?.toLowerCase().includes(searchTerm)) ||
                (pl.serial_no?.toLowerCase().includes(searchTerm)) ||
                (pl.store_id?.toLowerCase().includes(searchTerm)) ||
                (pl.mapping_id?.toString().includes(searchTerm)) ||
                (pl.id?.toString().includes(searchTerm)) ||
                (pl.finance_mappings?.store_name?.toLowerCase().includes(searchTerm));

            const matchesBrand = brandFilter === '' || pl.finance_mappings?.brand === brandFilter;
            return matchesSearch && matchesBrand;
        });

        if (exportablePinelabsData.length === 0) { window.showToast('No PL data to export based on current filters.', 'info'); return; }

        const exportData = exportablePinelabsData.map(pl => {
            const rm = pl.finance_mappings || {}; // Use pl.finance_mappings directly as it's attached.
            return { PL_ID: pl.id, MapID: pl.mapping_id || 'N/A', Store: rm.store_name || 'N/A', Brand: rm.brand || 'N/A', POS: pl.pos_id || '-', TID: pl.tid || '-', SNo: pl.serial_no || '-', StorePL: pl.store_id || '-' };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Overall PineLabs");
        XLSX.writeFile(wb, `Overall_PineLabs_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
        window.showToast('PL Excel export error: ' + err.message, 'error');
    }
});

window.refreshOverallTables = async () => {
    if (mainTabOverall && mainTabOverall.classList.contains('active')) {
        await window.loadOverallMainMappings();
        await window.loadOverallPinelabsDetails();
    }
};

window.addEventListener('load', async () => {
    const userRole = await window.checkUserRole();
    if (userRole === 'admin') {
        window.switchMainTab('overall');
    } else {
        //Added to force initial state form visible and correct tab selected
        formSection.style.display = 'block';
        window.switchMainTab('paper');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const mappingForm = document.getElementById('mapping-form');
    const formSection = document.getElementById('form-section');

    //Show the form on paper tab click
    document.getElementById("main-tab-paper").addEventListener("click", function () {
        formSection.style.display = "block";
    });

    mappingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        // Your existing form submission logic here (getting form data, etc.)
        //Here to add all of the data submition to to your Supabase
        //After the data submited hide the form
        formSection.style.display = 'none';

        // Refresh the mapping data after submission
        await window.loadMappings();

        console.log('Table displayed!');
    });

});