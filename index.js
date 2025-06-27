document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        mappingForm: document.getElementById('mapping-form'),
        storeName: document.getElementById('store-name'),
        brandToggle: document.getElementById('brand-toggle'),
        brandDropdown: document.getElementById('brand-dropdown'),
        appleCode: document.getElementById('apple-code'),
        appleCodeSection: document.getElementById('apple-code-section'),
        financier: document.getElementById('financier'),
        bajajCodeSection: document.getElementById('bajaj-code-section'),
        hdfcCodeSection: document.getElementById('hdfc-code-section'),
        hdbCodeSection: document.getElementById('hdb-code-section'),
        idfcCodeSection: document.getElementById('idfc-code-section'),
        kotakCodeSection: document.getElementById('kotak-code-section'),
        tvsCodeSection: document.getElementById('tvs-code-section'),
        benowCodeSection: document.getElementById('benow-code-section'),
        iciciCodeSection: document.getElementById('icici-code-section'),
        homeCreditCodeSection: document.getElementById('home-credit-code-section'),
        city: document.getElementById('city'),
        asm: document.getElementById('asm'),
        mailId: document.getElementById('mail-id'),
        requestedBy: document.getElementById('requested-by'),
        financierTab: document.getElementById('financier-tab'),
        pinelabsTab: document.getElementById('pinelabs-tab'),
        overallMappingTab: document.getElementById('overall-mapping-tab'),
        financiersSection: document.getElementById('financiers-section'),
        pinelabsSection: document.getElementById('pinelabs-section'),
        overallMainMappingSection: document.getElementById('overall-main-mapping-section'),
        overallPinelabs: document.getElementById('overall-pinelabs-section'),
        pinelabsEntries: document.getElementById('pinelabs-entries'),
        pinelabsSearchInput: document.getElementById('pinelabs-search-input'),
        addPinelabs: document.getElementById('add-pinelabs'),
        submitBtn: document.getElementById('submit-btn'),
        submitText: document.getElementById('submit-text'),
        submitLoading: document.getElementById('submit-loading'),
        cancelEditBtn: document.getElementById('cancel-edit-btn'),
        yourMappingsSearch: document.getElementById('yourMappingsSearch'),
        yourMappingsBrandFilter: document.getElementById('yourMappingsBrandFilter'),
        yourPinelabsSearch: document.getElementById('yourPinelabsSearch'),
        yourPinelabsBrandFilter: document.getElementById('yourPinelabsBrandFilter'),
        overallMainMappingsSearch: document.getElementById('overallMainMappingsSearch'),
        overallMainMappingsBrandFilter: document.getElementById('overallMainMappingsBrandFilter'),
        overallMainMappingsStoreNameFilter: document.getElementById('overallMainMappingsStoreNameFilter'),
        overallPinelabsSearch: document.getElementById('overallPinelabsSearch'),
        overallPinelabsBrandFilter: document.getElementById('overallPinelabsBrandFilter'),
        downloadExcel: document.getElementById('download-excel'),
        downloadOverallMainExcel: document.getElementById('download-overall-main-excel'),
        downloadOverallPinelabsExcel: document.getElementById('download-overallPineLabs-excel'),
        mappingTableBody: document.getElementById('mapping-table-body'),
        pinelabsTableBody: document.getElementById('pinelabs-table-body'),
        overallMainMappingTableBody: document.getElementById('overall-main-mapping-table-body'),
        overallPinelabsTableBody: document.getElementById('overall-pinelabs-table-body'),
    };

    if (!elements.mappingForm || !elements.pinelabsEntries || !elements.submitBtn) {
        console.error('Required DOM elements are missing');
        showToast('Failed to initialize form: Missing elements', 'error');
        return;
    }

    window.elements = elements;

    const pinelabsEntriesDomElement = elements.pinelabsEntries;
    const pinelabsSearchInput = elements.pinelabsSearchInput;
    let allPineLabsData = [];
    const posIdInputTemplate = pinelabsEntriesDomElement?.querySelector('.pinelabs-entry input[name="pos_id"]');
    const initialPosIdRequired = posIdInputTemplate ? posIdInputTemplate.hasAttribute('required') : false;

    if (elements.brandDropdown) {
        const dropdown = elements.brandDropdown;
        dropdown.style.position = 'relative';
        dropdown.style.zIndex = '10';
        dropdown.style.maxHeight = '200px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.backgroundColor = '#001f3f';
        dropdown.style.color = '#ffffff';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    }

    window.createPinelabsEntryHtml = (pos_id = '', tid = '', serial_no = '', store_id = '', includeRemoveButton = false, id = null) => {
        const displayId = id !== null ? data-id="${id}" : '';
        const currentEntries = pinelabsEntriesDomElement.children.length;
        const requiredAttribute = (currentEntries === 0 && pos_id === '' && initialPosIdRequired) ? 'required' : '';
        return `
            <div class="pinelabs-entry grid grid-cols-1 md:grid-cols-4 gap-4" ${displayId}>
                <div class="form-group mb-0">
                    <label class="hidden md:block">POS ID</label>
                    <input type="text" name="pos_id" placeholder="POS ID" class="form-control pinelabs-pos-id" value="${pos_id}" ${requiredAttribute}>
                </div>
                <div class="form-group mb-0">
                    <label class="hidden md:block">TID</label>
                    <input type="text" name="tid" placeholder="TID" class="form-control pinelabs-tid" value="${tid}">
                </div>
                <div class="form-group mb-0">
                    <label class="hidden md:block">Serial No</label>
                    <input type="text" name="serial_no" placeholder="Serial No" class="form-control pinelabs-serial-no" value="${serial_no}">
                </div>
                <div class="form-group mb-0" style="position: relative;">
                    <label class="hidden md:block">Store ID (PL)</label>
                    <input type="text" name="store_id" placeholder="Store ID" class="form-control pinelabs-store-id" value="${store_id}">
                    ${includeRemoveButton ? '<button type="button" class="btn-icon-only btn-delete-icon remove-pinelabs-entry" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); border: none;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>' : ''}
                </div>
            </div>
        `;
    };

    window.addPinelabsEntryWithRemoveButton = (pos_id = '', tid = '', serial_no = '', store_id = '') => {
        if (pinelabsEntriesDomElement.children.length >= 3) {
            showToast('Maximum 3 Pine Labs entries allowed', 'error');
            return;
        }
        pinelabsEntriesDomElement.insertAdjacentHTML('beforeend', window.createPinelabsEntryHtml(pos_id, tid, serial_no, store_id, true));
        window.checkAndAdjustRemoveButtons();
    };

    window.createEmptyPinelabsEntry = () => {
        pinelabsEntriesDomElement.innerHTML = '';
        pinelabsEntriesDomElement.insertAdjacentHTML('beforeend', window.createPinelabsEntryHtml());
        window.checkAndAdjustRemoveButtons();
        if (initialPosIdRequired) {
            const firstPosInput = pinelabsEntriesDomElement.querySelector('.pinelabs-pos-id');
            if (firstPosInput) firstPosInput.setAttribute('required', 'true');
        }
    };

    window.checkAndAdjustRemoveButtons = () => {
        const entries = pinelabsEntriesDomElement.children;
        const removeButtons = pinelabsEntriesDomElement.querySelectorAll('.remove-pinelabs-entry');
        removeButtons.forEach(btn => {
            btn.style.display = entries.length <= 1 ? 'none' : 'block';
            btn.removeEventListener('click', btn._handler);
            btn._handler = () => {
                btn.closest('.pinelabs-entry').remove();
                window.checkAndAdjustRemoveButtons();
            };
            btn.addEventListener('click', btn._handler);
        });
    };

    window.getSelectedBrands = () => {
        if (!elements.brandDropdown) {
            console.error('brandDropdown element is undefined');
            return [];
        }
        const checkboxes = elements.brandDropdown.querySelectorAll('input[name="brands"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    };

    window.getPineLabsEntries = () => {
        return Array.from(pinelabsEntriesDomElement.querySelectorAll('.pinelabs-entry')).map(entry => {
            const id = entry.getAttribute('data-id') ? parseInt(entry.getAttribute('data-id')) : null;
            return {
                id,
                pos_id: entry.querySelector('.pinelabs-pos-id').value.trim(),
                tid: entry.querySelector('.pinelabs-tid').value.trim(),
                serial_no: entry.querySelector('.pinelabs-serial-no').value.trim(),
                store_id: entry.querySelector('.pinelabs-store-id').value.trim(),
            };
        });
    };

    window.isEditMode = false;
    window.currentEditData = null;
    let isSubmitting = false;
    let userEmail = '';
    let lastSubmitTime = 0;
    const DEBOUNCE_DELAY = 300;
    let allMappingsData = [];

    if (!window.navigation) window.navigation = { appState: {} };
    else if (!window.navigation.appState) window.navigation.appState = {};

    const showToast = window.showToast || ((message, type) => alert(${type.toUpperCase()}: ${message}));
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    const showLoading = () => {
        elements.submitBtn.disabled = true;
        elements.submitText.classList.add('hidden');
        elements.submitLoading.classList.remove('hidden');
    };

    const hideLoading = () => {
        elements.submitBtn.disabled = false;
        elements.submitText.classList.remove('hidden');
        elements.submitLoading.classList.add('hidden');
    };

    const handleOperationError = (operation, error) => {
        console.error(${operation} error:, error);
        showToast(${operation} failed: ${error.message}, 'error');
    };

    const checkForDuplicateMapping = async (payload) => {
        try {
            const { data, error } = await window.supabaseClient
                .from('finance_mappings')
                .select('id')
                .eq('store_name', payload.store_name)
                .eq('brand', payload.brand)
                .eq('financier', payload.financier);
            if (error) throw error;
            return data.length > 0;
        } catch (error) {
            console.error('Error checking for duplicate:', error);
            return false;
        }
    };

    window.checkUserRole = async () => {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            const { data: roleData, error } = await window.supabaseClient
                .from('user_stores')
                .select('role')
                .eq('email_id', user.email);
            if (error) {
                if (error.code === 'PGRST116' || error.code === '42P01') {
                    console.warn('user_stores table not found or no data, defaulting to user');
                    return 'user';
                }
                throw error;
            }
            return roleData.some(r => r.role === 'admin') ? 'admin' : 'user';
        } catch (err) {
            console.warn('Error checking role, defaulting to user:', err.message);
            return 'user';
        }
    };

    const hasEditPermission = async (mappingUserId = null) => {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) return false;

            const userRole = await window.checkUserRole();
            if (userRole === 'admin') return true;

            if (mappingUserId && user.id === mappingUserId) return true;

            return false;
        } catch (error) {
            console.error('Error checking edit permission:', error);
            return false;
        }
    };

    const loadStoreNames = async () => {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            userEmail = user?.email || '';
            if (!userEmail) throw new Error('User not authenticated');
            if (elements.mailId) elements.mailId.value = userEmail; // Set initial mail ID
            const { data, error } = await window.supabaseClient
                .from('user_stores')
                .select('store_name')
                .order('store_name', { ascending: true });
            if (error) throw error;
            if (elements.storeName) {
                elements.storeName.innerHTML = '<option value="">Select Store Name</option>';
                if (data.length === 0) {
                    showToast('No stores available. Contact support.', 'warning');
                    elements.storeName.innerHTML = '<option value="">No stores available</option>';
                } else {
                    data.forEach(store => {
                        const option = document.createElement('option');
                        option.value = store.store_name;
                        option.textContent = store.store_name;
                        elements.storeName.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Load Store Names error:', error);
            showToast('Failed to load store names: ' + error.message, 'error');
            if (elements.storeName) elements.storeName.innerHTML = '<option value="">No stores available</option>';
        }
    };

    const updateBrandAndFinancierDisplay = (preserveFinancier = false, preserveAppleCode = false) => {
        const selectedBrands = window.getSelectedBrands();
        if (elements.appleCodeSection) {
            elements.appleCodeSection.classList.toggle('hidden', !selectedBrands.includes('Apple'));
            if (!preserveAppleCode && !selectedBrands.includes('Apple') && elements.appleCode) elements.appleCode.value = '';
        }
        const financier = elements.financier?.value || '';
        const codeSections = {
            'Bajaj': elements.bajajCodeSection,
            'Benow': elements.benowCodeSection,
            'HDB': elements.hdbCodeSection,
            'HDFC': elements.hdfcCodeSection,
            'Home Credit': elements.homeCreditCodeSection,
            'ICICI': elements.iciciCodeSection,
            'IDFC': elements.idfcCodeSection,
            'Kotak': elements.kotakCodeSection,
            'TVS': elements.tvsCodeSection
        };
        Object.values(codeSections).forEach(section => {
            if (section) {
                section.classList.add('hidden');
                const input = section.querySelector('input');
                if (input && !preserveFinancier) input.value = '';
            }
        });
        if (financier && codeSections[financier]) codeSections[financier].classList.remove('hidden');
    };

    if (elements.brandToggle) {
        elements.brandToggle.addEventListener('click', () => {
            if (elements.brandDropdown) elements.brandDropdown.style.display = elements.brandDropdown.style.display === 'block' ? 'none' : 'block';
        });
        if (elements.brandDropdown) {
            elements.brandDropdown.addEventListener('change', (e) => {
                if (e.target.name === 'brands') {
                    const selectedBrands = window.getSelectedBrands();
                    elements.brandToggle.textContent = selectedBrands.length > 0 ? selectedBrands.join(', ') : 'Select Brands';
                    updateBrandAndFinancierDisplay();
                }
            });
        }
    }

    window.switchMainTab = (tab) => {
        const paperTab = document.getElementById('main-tab-paper');
        const overallTab = document.getElementById('main-tab-overall');
        const paperContent = document.getElementById('paper-finance-content');
        const overallContent = document.getElementById('overall-mapping-content');

        if (paperTab && overallTab && paperContent && overallContent) {
            paperTab.classList.toggle('active', tab === 'paper');
            overallTab.classList.toggle('active', tab === 'overall');
            paperContent.classList.toggle('hidden', tab !== 'paper');
            overallContent.classList.toggle('hidden', tab !== 'overall');
        }
    };

    window.switchFormTab = (tab) => {
        if (elements.financierTab && elements.pinelabsTab && elements.overallMappingTab &&
            elements.financiersSection && elements.pinelabsSection &&
            elements.overallMainMappingSection && elements.overallPinelabs) {
            elements.financierTab.classList.toggle('active', tab === 'financier');
            elements.pinelabsTab.classList.toggle('active', tab === 'pinelabs');
            elements.overallMappingTab.classList.toggle('active', tab === 'overall');
            elements.financiersSection.classList.toggle('hidden', tab !== 'financier');
            elements.pinelabsSection.classList.toggle('hidden', tab !== 'pinelabs');
            elements.overallMainMappingSection.classList.toggle('hidden', tab !== 'overall');
            elements.overallPinelabs.classList.toggle('hidden', tab !== 'overall');
            const activeTabInput = document.getElementById('active-tab');
            if (activeTabInput) activeTabInput.value = tab;
        }
    };

    window.populateMappingTable = async (mappings, tableBody = elements.mappingTableBody, options = { editable: false, isAdminView: false }) => {
        if (!tableBody) {
            console.error('Mapping table body not found');
            return;
        }
        tableBody.innerHTML = '';
        if (!mappings || mappings.length === 0) {
            tableBody.innerHTML = options.isAdminView ? '<tr><td colspan="11" class="empty-state">No mappings found</td></tr>' : '<tr><td colspan="10" class="empty-state">No mappings found</td></tr>';
            return;
        }

        for (const mapping of mappings) {
            const canEdit = await hasEditPermission(mapping.user_id);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Store Name">${mapping.store_name || ''}</td>
                <td data-label="City">${mapping.city || ''}</td>
                <td data-label="Mail ID">${mapping.mail_id || ''}</td>
                ${options.isAdminView ? <td data-label="Additional Store Name">${mapping.store_name || '-'}</td> : ''}
                <td data-label="Brand">${mapping.brand || ''}</td>
                <td data-label="Brand Code">${mapping.brand_code || ''}</td>
                <td data-label="Financier">${mapping.financier || ''}</td>
                <td data-label="Financier Code">${mapping.financier_code || ''}</td>
                <td data-label="Requested By">${mapping.requested_by || ''}</td>
                <td data-label="Requested Date">${mapping.requested_date ? new Date(mapping.requested_date).toLocaleDateString() : '-'}</td>
                <td data-label="Actions" class="table-actions-column">
                    ${canEdit ? `
                        <button class="btn-icon-only btn-edit-icon" onclick="window.editMapping(${mapping.id})" aria-label="Edit mapping">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="btn-icon-only btn-delete-icon" onclick="${options.isAdminView ? window.deleteOverallMainMapping(${mapping.id}, window.elements) : window.deleteMapping(${mapping.id})}" aria-label="Delete mapping">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    ` : '-'}
                </td>
            `;
            tableBody.appendChild(row);
        }

        const brandFilter = options.isAdminView ? elements.overallMainMappingsBrandFilter : elements.yourMappingsBrandFilter;
        const storeNameFilter = options.isAdminView ? elements.overallMainMappingsStoreNameFilter : null;
        if (brandFilter) {
            const allBrands = [...new Set(mappings.map(m => m.brand).filter(b => b))].sort();
            brandFilter.innerHTML = '<option value="">All Brands</option>';
            allBrands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand || 'Unknown';
                brandFilter.appendChild(option);
            });
            brandFilter.value = brandFilter.value || '';
        }
        if (storeNameFilter && options.isAdminView) {
            const allStoreNames = [...new Set(mappings.map(m => m.store_name).filter(s => s))].sort();
            storeNameFilter.innerHTML = '<option value="">All Store Names</option>';
            allStoreNames.forEach(storeName => {
                const option = document.createElement('option');
                option.value = storeName;
                option.textContent = storeName || 'Unknown';
                storeNameFilter.appendChild(option);
            });
            storeNameFilter.value = storeNameFilter.value || '';
        }
    };

    window.populatePinelabsTable = async (tableBodyElement, pinelabsData, options = { editable: false, isAdminView: false }) => {
        if (!tableBodyElement) {
            console.error("Target table body for Pine Labs not found.");
            return;
        }

        const table = tableBodyElement.closest('table');
        if (table && table.tHead && table.tHead.rows[0]) {
            table.tHead.rows[0].innerHTML = <th>PL ID</th><th>Mapping ID</th><th>Store Name</th><th>Brand</th><th>POS ID</th><th>TID</th><th>Serial No</th><th>Store ID (PL)</th><th class="table-actions-column">Actions</th>;
        }

        allPineLabsData = Array.isArray(pinelabsData) ? pinelabsData : [];
        let dataToDisplay = allPineLabsData;
        const searchTerm = pinelabsSearchInput?.value?.toLowerCase().trim() || '';

        if (searchTerm !== '') {
            dataToDisplay = allPineLabsData.filter(pl => {
                const searchString = [
                    String(pl.id || ''),
                    String(pl.mapping_id || ''),
                    String(pl.finance_mappings?.store_name || ''),
                    String(pl.finance_mappings?.brand || ''),
                    String(pl.pos_id || ''),
                    String(pl.tid || ''),
                    String(pl.serial_no || ''),
                    String(pl.store_id || '')
                ].join(' ').toLowerCase();
                return searchString.includes(searchTerm);
            });
        }

        tableBodyElement.innerHTML = '';
        const colspan = table?.tHead?.rows[0]?.cells.length || 9;

        if (dataToDisplay.length > 0) {
            for (const pl of dataToDisplay) {
                const { data: mapping, error } = await window.supabaseClient
                    .from('finance_mappings')
                    .select('user_id')
                    .eq('id', pl.mapping_id)
                    .single();
                if (error) continue;
                const canEdit = await hasEditPermission(mapping?.user_id || null);

                const tr = tableBodyElement.insertRow();
                const mainMappingId = pl.finance_mappings?.id || pl.mapping_id;
                let actionsCellHtml = <td class="table-actions-column">-</td>;

                if (canEdit) {
                    actionsCellHtml = <td class="table-actions-column"><div class="action-buttons">;
                    if (mainMappingId) {
                        actionsCellHtml += <button class="btn btn-icon-only btn-edit-icon" onclick="window.editMapping(${mainMappingId})" title="Edit Main Mapping"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>;
                    }
                    actionsCellHtml += <button class="btn btn-icon-only btn-delete-icon" onclick="window.deleteSinglePinelabsDetail(${pl.id})" title="Delete Pine Labs Entry"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td>;
                }
                const storeName = pl.finance_mappings?.store_name || '-';
                const brand = pl.finance_mappings?.brand || '-';
                const mappingIdDisplay = pl.mapping_id || 'N/A';
                tr.innerHTML = `
                    <td class="table-id-column">${pl.id || '-'}</td><td>${mappingIdDisplay}</td><td>${storeName}</td>
                    <td data-brand="${brand}">${brand}</td><td>${pl.pos_id || '-'}</td><td>${pl.tid || '-'}</td>
                    <td>${pl.serial_no || '-'}</td><td>${pl.store_id || '-'}</td>${actionsCellHtml}`;
            }
        } else {
            tableBodyElement.innerHTML = <tr><td colspan="${colspan}" class="empty-state">${searchTerm ? 'No results found for your search.' : 'No Pine Labs details found.'}</td></tr>;
        }
    };

    window.filterPineLabsTable = debounce(async (isOverall = false) => {
        const pinelabsTableBody = isOverall ? elements.overallPinelabsTableBody : elements.pinelabsTableBody;
        if (!pinelabsTableBody) {
            console.error("Pinelabs table body not found for filtering.");
            return;
        }

        const searchInput = isOverall ? elements.overallPinelabsSearch : elements.yourPinelabsSearch;
        const brandFilter = isOverall ? elements.overallPinelabsBrandFilter : elements.yourPinelabsBrandFilter;
        const searchTerm = searchInput?.value?.toLowerCase().trim() || '';
        const brandFilterValue = brandFilter?.value || '';

        let filteredData = allPineLabsData.filter(pl => {
            const searchString = [
                String(pl.id || ''),
                String(pl.mapping_id || ''),
                String(pl.finance_mappings?.store_name || ''),
                String(pl.finance_mappings?.brand || ''),
                String(pl.pos_id || ''),
                String(pl.tid || ''),
                String(pl.serial_no || ''),
                String(pl.store_id || '')
            ].join(' ').toLowerCase();
            const matchesSearch = searchTerm === '' || searchString.includes(searchTerm);
            const matchesBrand = brandFilterValue === '' || (pl.finance_mappings?.brand === brandFilterValue);
            return matchesSearch && matchesBrand;
        });

        await window.populatePinelabsTable(pinelabsTableBody, filteredData, { editable: true, isAdminView: isOverall });
    }, DEBOUNCE_DELAY);

    window.deleteSinglePinelabsDetail = async (detailId) => {
        if (!confirm('Delete this specific Pine Labs entry?')) return;
        try {
            const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('Authentication required.');

            const userRole = await window.checkUserRole();
            if (userRole !== 'admin') {
                const { data: detail, error: fetchErr } = await window.supabaseClient.from('pinelabs_details').select('mapping_id').eq('id', detailId).single();
                if (fetchErr || !detail) throw fetchErr || new Error("Detail not found");

                const { data: mapping, error: mapErr } = await window.supabaseClient.from('finance_mappings').select('user_id').eq('id', detail.mapping_id).single();
                if (mapErr || !mapping) throw mapErr || new Error("Associated mapping not found");

                if (mapping.user_id !== user.id) throw new Error('Permission denied.');
            }

            const { error } = await window.supabaseClient.from('pinelabs_details').delete().eq('id', detailId);
            if (error) throw error;

            showToast('Pine Labs entry deleted.', 'success');
            allPineLabsData = allPineLabsData.filter(pl => pl.id !== detailId);
            await window.filterPineLabsTable();

            if (typeof window.loadMappings === 'function') await window.loadMappings();
            if (typeof window.refreshOverallTables === 'function') await window.refreshOverallTables();
        } catch (err) {
            handleOperationError('Delete Pine Labs Entry', err);
        }
    };

    window.updatePineLabsDetails = async (mappingId, pineLabsDetailsArray) => {
        if (!mappingId) {
            showToast('Cannot update Pine Labs: Mapping ID missing.', 'error');
            throw new Error('Mapping ID is required.');
        }

        try {
            const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                showToast('Authentication required to update Pine Labs details.', 'error');
                throw new Error('User not authenticated.');
            }

            const userRole = await window.checkUserRole();
            if (userRole !== 'admin') {
                const { data: mapping, error: mapErr } = await window.supabaseClient
                    .from('finance_mappings')
                    .select('user_id')
                    .eq('id', mappingId)
                    .single();
                if (mapErr || !mapping) throw mapErr || new Error('Associated mapping not found or permission denied.');
                if (mapping.user_id !== user.id) throw new Error('Permission denied: You can only update Pine Labs details for your own mappings.');
            }

            const { data: existingDetailsDb, error: fetchExistingErr } = await window.supabaseClient
                .from('pinelabs_details')
                .select('id, pos_id, tid, serial_no, store_id, mapping_id')
                .eq('mapping_id', mappingId);
            if (fetchExistingErr) throw fetchExistingErr;

            const existingDbMap = new Map(existingDetailsDb?.map(d => [d.id, d]) || []);
            const detailsToInsert = pineLabsDetailsArray
                .filter(pl => pl.id === null && (pl.pos_id || pl.tid || pl.serial_no || pl.store_id))
                .map(pl => ({
                    pos_id: pl.pos_id,
                    tid: pl.tid,
                    serial_no: pl.serial_no,
                    store_id: pl.store_id,
                    mapping_id: mappingId,
                    user_id: user.id
                }));
            const detailsToUpdate = pineLabsDetailsArray
                .filter(pl => pl.id !== null && existingDbMap.has(pl.id))
                .map(pl => {
                    const existing = existingDbMap.get(pl.id);
                    return {
                        id: pl.id,
                        ...pl,
                        ...(existing.pos_id !== pl.pos_id || existing.tid !== pl.tid || existing.serial_no !== pl.serial_no || existing.store_id !== pl.store_id ? pl : {})
                    };
                }).filter(pl => Object.keys(pl).length > 1);
            const idsToDelete = Array.from(existingDbMap.keys()).filter(id => !pineLabsDetailsArray.some(pl => pl.id === id));

            if (idsToDelete.length > 0) {
                const { error } = await window.supabaseClient.from('pinelabs_details').delete().in('id', idsToDelete);
                if (error) throw error;
                allPineLabsData = allPineLabsData.filter(pl => !idsToDelete.includes(pl.id));
            }

            if (detailsToInsert.length > 0) {
                const { data: insertedData, error: insErr } = await window.supabaseClient
                    .from('pinelabs_details')
                    .insert(detailsToInsert)
                    .select('id, pos_id, tid, serial_no, store_id, mapping_id');
                if (insErr) throw insErr;
                allPineLabsData = allPineLabsData.concat(insertedData.map(item => ({ ...item, finance_mappings: null })));
            }

            if (detailsToUpdate.length > 0) {
                const updates = detailsToUpdate.map(({ id, ...update }) => ({
                    ...update,
                    id,
                    mapping_id: mappingId
                }));
                const { error } = await window.supabaseClient.from('pinelabs_details').update(updates).in('id', detailsToUpdate.map(d => d.id));
                if (error) throw error;
                detailsToUpdate.forEach(update => {
                    const index = allPineLabsData.findIndex(pl => pl.id === update.id);
                    if (index > -1) allPineLabsData[index] = { ...allPineLabsData[index], ...update };
                });
            }

            await window.filterPineLabsTable();
            if (typeof window.loadMappings === 'function') await window.loadMappings();
            if (typeof window.refreshOverallTables === 'function') await window.refreshOverallTables();
            showToast('Pine Labs details updated successfully.', 'success');
        } catch (err) {
            showToast('Updating Pine Labs details failed: ' + err.message, 'error');
            throw err;
        }
    };

    window.handleFormSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        showLoading();
        try {
            const now = Date.now();
            if (now - lastSubmitTime < DEBOUNCE_DELAY) {
                showToast('Please wait before submitting again', 'error');
                return;
            }
            lastSubmitTime = now;

            const selectedBrands = window.getSelectedBrands();
            if (selectedBrands.length === 0) throw new Error('Please select at least one brand');

            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const userId = user?.id || '';
            if (!userId) throw new Error('User not authenticated');

            if (elements.mailId) elements.mailId.value = userEmail; // Preserve login email

            const pinelabsEntries = window.getPineLabsEntries();
            const financier = elements.financier?.value || '';
            const codeSections = {
                'Bajaj': elements.bajajCodeSection,
                'Benow': elements.benowCodeSection,
                'HDB': elements.hdbCodeSection,
                'HDFC': elements.hdfcCodeSection,
                'Home Credit': elements.homeCreditCodeSection,
                'ICICI': elements.iciciCodeSection,
                'IDFC': elements.idfcCodeSection,
                'Kotak': elements.kotakCodeSection,
                'TVS': elements.tvsCodeSection
            };

            let financeCode = '';
            if (financier && codeSections[financier]) {
                const input = codeSections[financier].querySelector('input');
                financeCode = input ? input.value.trim() || '' : '';
                if (financier && !financeCode) throw new Error('Please fill in the financier code for the selected financier');
            }

            const mappingIds = [];
            const financierDataBase = {
                store_name: elements.storeName?.value.trim() || '',
                city: elements.city?.value.trim() || '',
                mail_id: elements.mailId?.value.trim() || userEmail, // Use login email
                brand: '',
                brand_code: '',
                financier: financier,
                financier_code: financeCode,
                asm: elements.asm?.value.trim() || '',
                requested_by: elements.requestedBy?.value.trim() || '',
                requested_date: new Date().toISOString(),
                user_id: userId,
            };

            if (!financierDataBase.store_name || !financierDataBase.financier.trim() || !financierDataBase.city || !financierDataBase.requested_by) {
                const missingFields = [];
                if (!financierDataBase.store_name) missingFields.push('Store Name');
                if (!financierDataBase.financier.trim()) missingFields.push('Financier');
                if (!financierDataBase.city) missingFields.push('City');
                if (!financierDataBase.requested_by) missingFields.push('Requested By');
                throw new Error(Please fill in all required fields: ${missingFields.join(', ')});
            }

            if (!window.isEditMode) {
                const { data, error } = await window.supabaseClient
                    .from('finance_mappings')
                    .insert(selectedBrands.map(brand => ({
                        ...financierDataBase,
                        brand: brand,
                        brand_code: brand === 'Apple' ? elements.appleCode?.value.trim() || '' : ''
                    })))
                    .select('id');
                if (error) throw error;
                mappingIds.push(...data.map(d => d.id));

                const isDuplicate = await checkForDuplicateMapping(financierDataBase);
                if (isDuplicate) {
                    showToast(One or more mappings already exist, 'error');
                    mappingIds.forEach(id => {
                        window.supabaseClient.from('finance_mappings').delete().eq('id', id);
                    });
                    return;
                }
            } else {
                const { data, error } = await window.supabaseClient
                    .from('finance_mappings')
                    .update({
                        ...financierDataBase,
                        brand: selectedBrands[0],
                        brand_code: selectedBrands[0] === 'Apple' ? elements.appleCode?.value.trim() || '' : ''
                    })
                    .eq('id', window.currentEditData.id)
                    .select('id')
                    .single();
                if (error) throw error;
                mappingIds.push(data.id);
            }

            if (pinelabsEntries.length > 0) {
                if (!window.isEditMode) {
                    await Promise.all(mappingIds.map(id => window.updatePineLabsDetails(id, pinelabsEntries)));
                } else {
                    await window.updatePineLabsDetails(mappingIds[0], pinelabsEntries);
                }
            }

            showToast(window.isEditMode ? 'Mapping updated successfully' : 'Mappings created successfully', 'success');
            window.navigation.appState.hasSubmittedInSession = true;
            elements.mappingForm.reset();
            window.createEmptyPinelabsEntry();

            const brandCheckboxes = document.querySelectorAll('#brand-dropdown input[type="checkbox"]');
            brandCheckboxes.forEach(checkbox => checkbox.checked = false);
            elements.brandToggle.textContent = 'Select Brands'; // Reset brand toggle text

            if (elements.mailId) elements.mailId.value = userEmail; // Restore mail ID after reset
            window.switchMainTab('paper'); // Switch to Paper Finance and Pinelabs Mapping tab
            window.switchFormTab('financier'); // Switch to Financiers sub-tab
            updateBrandAndFinancierDisplay();
            window.isEditMode = false;
            elements.cancelEditBtn.classList.add('hidden');
            elements.submitText.textContent = 'Submit Mapping Request';
            await refreshTables();
        } catch (error) {
            handleOperationError('Form Submission', error);
        } finally {
            isSubmitting = false;
            hideLoading();
        }
    };

    window.editMapping = async (id) => {
        try {
            const { data, error } = await window.supabaseClient
                .from('finance_mappings')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            window.isEditMode = true;
            window.currentEditData = data;
            elements.submitText.textContent = 'Update Mapping';
            elements.cancelEditBtn.classList.remove('hidden');
            elements.storeName.value = data.store_name || '';
            if (elements.brandDropdown) {
                elements.brandDropdown.querySelectorAll('input[name="brands"]').forEach(checkbox => {
                    checkbox.checked = checkbox.value === data.brand;
                });
                const selectedBrands = window.getSelectedBrands();
                elements.brandToggle.textContent = selectedBrands.length > 0 ? selectedBrands.join(', ') : 'Select Brands';
            }
            elements.appleCode.value = data.brand_code || '';
            elements.financier.value = data.financier || '';
            elements.city.value = data.city || '';
            elements.asm.value = data.asm || '';
            elements.requestedBy.value = data.requested_by || '';
            if (elements.mailId) elements.mailId.value = data.mail_id || userEmail; // Use stored email or login email
            updateBrandAndFinancierDisplay(true, true);
            const { data: pinelabsData, error: pinelabsError } = await window.supabaseClient
                .from('pinelabs_details')
                .select('*')
                .eq('mapping_id', id);
            if (pinelabsError) throw pinelabsError;
            pinelabsEntriesDomElement.innerHTML = '';
            if (pinelabsData.length > 0) {
                pinelabsData.forEach(entry => {
                    pinelabsEntriesDomElement.insertAdjacentHTML('beforeend', window.createPinelabsEntryHtml(
                        entry.pos_id,
                        entry.tid,
                        entry.serial_no,
                        entry.store_id,
                        true,
                        entry.id
                    ));
                });
                window.switchFormTab('pinelabs');
            } else {
                window.createEmptyPinelabsEntry();
                window.switchFormTab('financier');
            }
            window.checkAndAdjustRemoveButtons();
        } catch (error) {
            handleOperationError('Edit Mapping', error);
        }
    };

    window.editMappingOverall = async (id) => await window.editMapping(id);

    window.editPinelabs = async (id) => {
        try {
            const { data, error } = await window.supabaseClient
                .from('pinelabs_details')
                .select('*, finance_mappings(id, store_name, brand, user_id)')
                .eq('id', id)
                .single();
            if (error) throw error;
            window.isEditMode = true;
            window.currentEditData = data;
            elements.submitText.textContent = 'Update Pine Labs Entry';
            elements.cancelEditBtn.classList.remove('hidden');
            elements.storeName.value = data.finance_mappings?.store_name || '';
            if (elements.brandDropdown) {
                elements.brandDropdown.querySelectorAll('input[name="brands"]').forEach(checkbox => {
                    checkbox.checked = checkbox.value === data.finance_mappings?.brand;
                });
                const selectedBrands = window.getSelectedBrands();
                elements.brandToggle.textContent = selectedBrands.length > 0 ? selectedBrands.join(', ') : 'Select Brands';
            }
            updateBrandAndFinancierDisplay(true, true);
            pinelabsEntriesDomElement.innerHTML = '';
            pinelabsEntriesDomElement.insertAdjacentHTML('beforeend', window.createPinelabsEntryHtml(
                data.pos_id,
                data.tid,
                data.serial_no,
                data.store_id,
                true,
                data.id
            ));
            window.switchFormTab('pinelabs');
            window.checkAndAdjustRemoveButtons();
        } catch (error) {
            handleOperationError('Edit Pine Labs Entry', error);
        }
    };

    window.deleteMapping = async (id) => {
        if (!confirm('Delete this mapping and its Pine Labs entries?')) return;
        try {
            const { error: pinelabsError } = await window.supabaseClient
                .from('pinelabs_details')
                .delete()
                .eq('mapping_id', id);
            if (pinelabsError) throw pinelabsError;
            const { error: mappingError } = await window.supabaseClient
                .from('finance_mappings')
                .delete()
                .eq('id', id);
            if (mappingError) throw mappingError;
            allPineLabsData = allPineLabsData.filter(pl => pl.mapping_id !== id);
            await refreshTables();
            showToast('Mapping deleted successfully', 'success');
        } catch (error) {
            handleOperationError('Delete Mapping', error);
        }
    };

    window.deleteOverallMainMapping = async (id) => {
        if (!confirm('Delete this overall mapping and its Pine Labs entries?')) return;
        try {
            const { error: pinelabsError } = await window.supabaseClient
                .from('pinelabs_details')
                .delete()
                .eq('mapping_id', id);
            if (pinelabsError) throw pinelabsError;
            const { error: mappingError } = await window.supabaseClient
                .from('finance_mappings')
                .delete()
                .eq('id', id);
            if (mappingError) throw mappingError;
            allPineLabsData = allPineLabsData.filter(pl => pl.mapping_id !== id);
            await refreshTables();
            showToast('Overall mapping deleted successfully', 'success');
        } catch (error) {
            handleOperationError('Delete Overall Mapping', error);
        }
    };

    const refreshTables = debounce(async () => {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const userId = user?.id || '';
            if (!userId) throw new Error('User not authenticated');
            const userRole = await window.checkUserRole();

            const [userMappingsRes, allMappingsRes] = await Promise.all([
                window.supabaseClient.from('finance_mappings').select('*').eq('user_id', userId),
                userRole === 'admin' ? window.supabaseClient.from('finance_mappings').select('*') : { data: [], error: null }
            ]);
            if (userMappingsRes.error) throw userMappingsRes.error;
            if (allMappingsRes.error) throw allMappingsRes.error;

            window.navigation.appState.currentMappingsData = userMappingsRes.data || [];
            await window.populateMappingTable(userMappingsRes.data, elements.mappingTableBody, { editable: true, isAdminView: false });

            if (userRole === 'admin') {
                allMappingsData = allMappingsRes.data;
                window.navigation.appState.currentOverallMainMappingsData = allMappingsRes.data || [];
                await window.populateMappingTable(allMappingsRes.data, elements.overallMainMappingTableBody, { editable: true, isAdminView: true });
            } else if (elements.overallMainMappingTableBody) {
                elements.overallMainMappingTableBody.innerHTML = '';
            }

            const mappingIds = userMappingsRes.data.map(m => m.id);
            const { data: pinelabsData, error: pinelabsError } = await window.supabaseClient
                .from('pinelabs_details')
                .select(`
                    id,
                    pos_id,
                    tid,
                    serial_no,
                    store_id,
                    mapping_id,
                    finance_mappings!pinelabs_details_mapping_id_fkey (brand, id, store_name, user_id)
                `)
                .in('mapping_id', mappingIds);
            if (pinelabsError) throw pinelabsError;

            const mappingIdMap = new Map(userMappingsRes.data.map(m => [m.id, m]));
            allPineLabsData = pinelabsData.map(pl => ({
                ...pl,
                finance_mappings: mappingIdMap.get(pl.mapping_id) || pl.finance_mappings || { brand: '', id: null, store_name: '', user_id: null }
            }));
            await window.populatePinelabsTable(elements.pinelabsTableBody, allPineLabsData, { editable: true, isAdminView: false });

            if (userRole === 'admin') {
                await window.populatePinelabsTable(elements.overallPinelabsTableBody, allPineLabsData, { editable: true, isAdminView: true });
            } else if (elements.overallPinelabsTableBody) {
                elements.overallPinelabsTableBody.innerHTML = '';
            }
        } catch (error) {
            handleOperationError('Refresh Tables', error);
        }
    }, DEBOUNCE_DELAY);

    window.refreshOverallTables = debounce(async () => {
        try {
            const userRole = await window.checkUserRole();
            if (userRole !== 'admin') return;

            const { data: allMappingsRes, error } = await window.supabaseClient.from('finance_mappings').select('*');
            if (error) throw error;

            allMappingsData = allMappingsRes;
            window.navigation.appState.currentOverallMainMappingsData = allMappingsRes || [];
            await window.populateMappingTable(allMappingsRes, elements.overallMainMappingTableBody, { editable: true, isAdminView: true });

            const mappingIds = allMappingsRes.map(m => m.id);
            const { data: pinelabsData, error: pinelabsError } = await window.supabaseClient
                .from('pinelabs_details')
                .select(`
                    id,
                    pos_id,
                    tid,
                    serial_no,
                    store_id,
                    mapping_id,
                    finance_mappings!pinelabs_details_mapping_id_fkey (brand, id, store_name, user_id)
                `)
                .in('mapping_id', mappingIds);
            if (pinelabsError) throw pinelabsError;

            const mappingIdMap = new Map(allMappingsRes.map(m => [m.id, m]));
            allPineLabsData = pinelabsData.map(pl => ({
                ...pl,
                finance_mappings: mappingIdMap.get(pl.mapping_id) || pl.finance_mappings || { brand: '', id: null, store_name: '', user_id: null }
            }));
            await window.populatePinelabsTable(elements.overallPinelabsTableBody, allPineLabsData, { editable: true, isAdminView: true });
        } catch (error) {
            handleOperationError('Refresh Overall Tables', error);
        }
    }, DEBOUNCE_DELAY);

    window.loadMappings = async () => {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const userId = user?.id || '';
            if (!userId) throw new Error('User not authenticated');
            const { data, error } = await window.supabaseClient.from('finance_mappings').select('*').eq('user_id', userId);
            if (error) throw error;
            window.navigation.appState.currentMappingsData = data || [];
            await window.populateMappingTable(data, elements.mappingTableBody, { editable: true, isAdminView: false });
        } catch (error) {
            handleOperationError('Load Mappings', error);
        }
    };

    if (elements.mappingForm) elements.mappingForm.addEventListener('submit', window.handleFormSubmit);
    if (elements.financier) elements.financier.addEventListener('change', () => updateBrandAndFinancierDisplay());
    if (elements.addPinelabs) elements.addPinelabs.addEventListener('click', () => window.addPinelabsEntryWithRemoveButton());
    if (elements.cancelEditBtn) {
        elements.cancelEditBtn.addEventListener('click', () => {
            elements.mappingForm.reset();
            window.createEmptyPinelabsEntry();
            if (elements.mailId) elements.mailId.value = userEmail; // Restore mail ID on cancel
            updateBrandAndFinancierDisplay();
            window.switchMainTab('paper'); // Switch to Paper Finance and Pinelabs Mapping tab
            window.switchFormTab('financier');
            window.isEditMode = false;
            elements.cancelEditBtn.classList.add('hidden');
            elements.submitText.textContent = 'Submit Mapping Request';
        });
    }
    if (elements.yourMappingsSearch) elements.yourMappingsSearch.addEventListener('input', debounce(window.applyYourMappingsFilter, DEBOUNCE_DELAY));
    if (elements.yourMappingsBrandFilter) elements.yourMappingsBrandFilter.addEventListener('change', window.applyYourMappingsFilter);
    if (elements.yourPinelabsSearch) elements.yourPinelabsSearch.addEventListener('input', debounce(() => window.filterPineLabsTable(), DEBOUNCE_DELAY));
    if (elements.yourPinelabsBrandFilter) elements.yourPinelabsBrandFilter.addEventListener('change', () => window.filterPineLabsTable());
    if (elements.overallMainMappingsSearch) elements.overallMainMappingsSearch.addEventListener('input', debounce(window.applyOverallMainMappingsFilter, DEBOUNCE_DELAY));
    if (elements.overallMainMappingsBrandFilter) elements.overallMainMappingsBrandFilter.addEventListener('change', window.applyOverallMainMappingsFilter);
    if (elements.overallMainMappingsStoreNameFilter) elements.overallMainMappingsStoreNameFilter.addEventListener('change', window.applyOverallMainMappingsFilter);
    if (elements.overallPinelabsSearch) elements.overallPinelabsSearch.addEventListener('input', debounce(() => window.filterPineLabsTable(true), DEBOUNCE_DELAY));
    if (elements.overallPinelabsBrandFilter) elements.overallPinelabsBrandFilter.addEventListener('change', () => window.filterPineLabsTable(true));
    if (elements.downloadExcel) elements.downloadExcel.addEventListener('click', () => {
        const data = prepareExcelData(window.navigation?.appState?.currentMappingsData || [], 'mappings');
        downloadExcel(data, 'Your_Mappings.xlsx');
    });
    if (elements.downloadOverallMainExcel) elements.downloadOverallMainExcel.addEventListener('click', () => {
        const data = prepareExcelData(window.navigation?.appState?.currentOverallMainMappingsData || [], 'mappings');
        downloadExcel(data, 'Overall_Main_Mappings.xlsx');
    });
    if (elements.downloadOverallPinelabsExcel) elements.downloadOverallPinelabsExcel.addEventListener('click', () => {
        const data = prepareExcelData(allPineLabsData, 'pinelabs');
        downloadExcel(data, 'Overall_Pinelabs_Details.xlsx');
    });

    document.getElementById('main-tab-paper')?.addEventListener('click', () => window.switchMainTab('paper'));
    document.getElementById('main-tab-overall')?.addEventListener('click', () => window.switchMainTab('overall'));

    const applyYourMappingsFilter = () => {
        const searchTerm = elements.yourMappingsSearch?.value.toLowerCase() || '';
        const brandFilter = elements.yourMappingsBrandFilter?.value || '';
        const mappingsData = window.navigation?.appState?.currentMappingsData || [];
        const filteredMappings = mappingsData.filter(mapping => {
            const matchesSearch = (
                mapping.store_name?.toLowerCase().includes(searchTerm) ||
                mapping.city?.toLowerCase().includes(searchTerm) ||
                mapping.mail_id?.toLowerCase().includes(searchTerm) ||
                mapping.brand?.toLowerCase().includes(searchTerm) ||
                mapping.financier?.toLowerCase().includes(searchTerm) ||
                mapping.requested_by?.toLowerCase().includes(searchTerm)
            );
            const matchesBrand = brandFilter ? mapping.brand === brandFilter : true;
            return matchesSearch && matchesBrand;
        });
        window.populateMappingTable(filteredMappings, elements.mappingTableBody, { editable: true, isAdminView: false });
    };

    const applyOverallMainMappingsFilter = () => {
        const searchTerm = elements.overallMainMappingsSearch?.value.toLowerCase() || '';
        const brandFilter = elements.overallMainMappingsBrandFilter?.value || '';
        const storeNameFilter = elements.overallMainMappingsStoreNameFilter?.value || '';
        const mappingsData = window.navigation?.appState?.currentOverallMainMappingsData || [];
        const filteredMappings = mappingsData.filter(mapping => {
            const matchesSearch = (
                mapping.store_name?.toLowerCase().includes(searchTerm) ||
                mapping.city?.toLowerCase().includes(searchTerm) ||
                mapping.mail_id?.toLowerCase().includes(searchTerm) ||
                mapping.brand?.toLowerCase().includes(searchTerm) ||
                mapping.financier?.toLowerCase().includes(searchTerm) ||
                mapping.requested_by?.toLowerCase().includes(searchTerm)
            );
            const matchesBrand = brandFilter ? mapping.brand === brandFilter : true;
            const matchesStoreName = storeNameFilter ? mapping.store_name === storeNameFilter : true;
            return matchesSearch && matchesBrand && matchesStoreName;
        });
        window.populateMappingTable(filteredMappings, elements.overallMainMappingTableBody, { editable: true, isAdminView: true });
    };

    window.applyYourMappingsFilter = debounce(applyYourMappingsFilter, DEBOUNCE_DELAY);
    window.applyOverallMainMappingsFilter = debounce(applyOverallMainMappingsFilter, DEBOUNCE_DELAY);

    const prepareExcelData = (data, type) => {
        if (type === 'mappings') {
            return data.map(item => ({
                'Req ID': item.id,
                'Store Name': item.store_name,
                'City': item.city,
                'Additional Store Name': item.store_name || '-',
                'Mail ID': item.mail_id,
                'Brand': item.brand,
                'Brand Code': item.brand_code,
                'Financier': item.financier,
                'Financier Code': item.financier_code,
                'Requested By': item.requested_by,
                'Requested Date': item.requested_date ? new Date(item.requested_date).toLocaleDateString() : '-',
            }));
        } else {
            return data.map(item => ({
                'Store Name': item.finance_mappings?.store_name || '',
                'Brand': item.finance_mappings?.brand || '',
                'POS ID': item.pos_id || '',
                'TID': item.tid || '',
                'Serial No': item.serial_no || '',
                'Store ID (PL)': item.store_id || '',
            }));
        }
    };

    const downloadExcel = (data, filename) => {
        if (!window.XLSX) {
            showToast('Excel export library not loaded', 'error');
            return;
        }
        const ws = window.XLSX.utils.json_to_sheet(data);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        window.XLSX.writeFile(wb, filename);
    };

    window.handleLogout = async (event) => {
        event.preventDefault();
        try {
            if (!window.navigation.appState || !window.supabaseClient?.auth) throw new Error('Initialization error');
            const { error } = await window.supabaseClient.auth.signOut();
            if (error) throw error;
            const showNotification = window.navigation.appState.currentUserRole !== 'admin' && window.navigation.appState.hasSubmittedInSession;
            if (showNotification) {
                const style = document.createElement('style');
                style.id = 'logout-notification-style';
                style.textContent = `
                    .logout-notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background-color: #4caf50;
                        color: white;
                        padding: 16px 24px;
                        border-radius: 8px;
                        z-index: 1000;
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        font-size: 16px;
                        line-height: 1.5;
                        animation: slideIn 0.5s ease-in-out forwards;
                        max-width: 320px;
                    }
                    .logout-notification.fade-out {
                        opacity: 0;
                        transform: translateY(-30px) scale(0.95);
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                        transition: opacity 0.5s ease-out, transform 0.5s ease-out, box-shadow 0.3s ease-out;
                    }
                    @keyframes slideIn {
                        0% { opacity: 0; transform: translateY(-20px) scale(0.95); }
                        100% { opacity: 1; transform: translateY(0) scale(1); }
                    }
                `;
                document.head.appendChild(style);
                const notificationElement = document.createElement('div');
                notificationElement.textContent = 'The Given Brand Mapping will be Completed within 5 Working Days';
                notificationElement.classList.add('logout-notification');
                document.body.appendChild(notificationElement);
                setTimeout(() => {
                    notificationElement.classList.add('fade-out');
                    setTimeout(() => {
                        notificationElement.remove();
                        document.getElementById('logout-notification-style')?.remove();
                        window.location.href = 'login.html';
                    }, 500);
                }, 3000);
            } else {
                window.location.href = 'login.html';
            }
        } catch (error) {
            handleOperationError('Logout', error);
        }
    };

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        userEmail = user?.email || '';
        if (elements.mailId) elements.mailId.value = userEmail;
        window.navigation.appState.currentUserRole = await window.checkUserRole();
        window.navigation.appState.hasSubmittedInSession = false;
        await loadStoreNames();
        window.createEmptyPinelabsEntry();
        updateBrandAndFinancierDisplay();
        window.switchMainTab('paper'); // Initialize to Paper Finance and Pinelabs Mapping tab
        window.switchFormTab('financier');
        await refreshTables();
        document.getElementById('confirm-logout')?.addEventListener('click', window.handleLogout);
    } catch (error) {
        handleOperationError('Initial Setup', error);
    }
});

window.isApplyingFilter = false;
