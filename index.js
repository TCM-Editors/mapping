document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const elements = {
        mappingForm: document.getElementById('mapping-form'),
        storeName: document.getElementById('store-name'),
        brand: document.getElementById('brand'),
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
        overallMappingTab: document.getElementById('overall-mapping-tab'), // New tab for overall mappings
        financiersSection: document.getElementById('financiers-section'),
        pinelabsSection: document.getElementById('pinelabs-section'),
        overallMainMappingSection: document.getElementById('overall-main-mapping-section'), // New section
        overallPinelabsSection: document.getElementById('overall-pinelabs-section'), // New section
        pinelabsEntries: document.getElementById('pinelabs-entries'),
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
        overallPinelabsSearch: document.getElementById('overallPinelabsSearch'),
        overallPinelabsBrandFilter: document.getElementById('overallPinelabsBrandFilter'),
        downloadExcel: document.getElementById('download-excel'),
        downloadOverallMainExcel: document.getElementById('download-overall-main-excel'),
        downloadOverallPinelabsExcel: document.getElementById('download-overall-pinelabs-excel'),
        mappingTableBody: document.getElementById('mapping-table-body'),
        pinelabsTableBody: document.getElementById('pinelabs-table-body'),
        overallMainMappingTableBody: document.getElementById('overall-main-mapping-table-body'),
        overallPinelabsTableBody: document.getElementById('overall-pinelabs-table-body'),
    };

    // State Variables
    window.isEditMode = false;
    window.currentEditData = null;
    let isSubmitting = false;
    let userEmail = '';
    let lastSubmitTime = 0;
    const DEBOUNCE_DELAY = 1000;
    let allPineLabsData = [];
    let allMappingsData = []; // To store all mappings for dropdown population

    // Initialize navigation.appState if it doesn't exist
    if (!window.navigation) {
        window.navigation = { appState: {} };
    } else if (!window.navigation.appState) {
        window.navigation.appState = {};
    }

    // Pine Labs Form Setup
    const pinelabsEntriesDomElement = elements.pinelabsEntries;
    const initialPosIdRequired = pinelabsEntriesDomElement?.querySelector('.pinelabs-entry input[name="pos_id"]')?.hasAttribute('required') || false;

    // Utility Functions
    const showToast = window.showToast;

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    const showLoading = () => {
        if (elements.submitBtn) elements.submitBtn.disabled = true;
        if (elements.submitText) elements.submitText.classList.add('hidden');
        if (elements.submitLoading) elements.submitLoading.classList.remove('hidden');
    };

    const hideLoading = () => {
        if (elements.submitBtn) elements.submitBtn.disabled = false;
        if (elements.submitText) elements.submitText.classList.remove('hidden');
        if (elements.submitLoading) elements.submitLoading.classList.add('hidden');
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

    window.checkUserRole = window.checkUserRole || (async () => {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            const { data: roleData, error } = await window.supabaseClient
                .from('user_stores')
                .select('role')
                .eq('email_id', user.email);
            
            if (error) throw error;
            if (!roleData || roleData.length === 0) {
                console.warn(No role found for user with email ${user.email}, defaulting to non-admin role);
                return 'non-admin';
            }
            return roleData[0].role || 'non-admin';
        } catch (err) {
            console.warn('Error checking role, defaulting to non-admin role:', err.message);
            return 'non-admin';
        }
    });

    // Pine Labs Form Functions
    window.createPinelabsEntryHtml = (pos_id = '', tid = '', serial_no = '', store_id = '', includeRemoveButton = false, id = null) => {
        const displayId = id !== null ? data-id="${id}" : '';
        const currentEntries = pinelabsEntriesDomElement ? pinelabsEntriesDomElement.children.length : 0;
        const requiredAttribute = (currentEntries === 0 && pos_id === '' && initialPosIdRequired) ? 'required' : '';

        return `
            <div class="pinelabs-entry grid grid-cols-1-md-4 gap-md" ${displayId}>
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

    window.addPinelabsEntryWithRemoveButton = () => {
        if (pinelabsEntriesDomElement && pinelabsEntriesDomElement.children.length < 3) {
            pinelabsEntriesDomElement.insertAdjacentHTML('beforeend', window.createPinelabsEntryHtml('', '', '', '', true));
            window.checkAndAdjustRemoveButtons();
        } else {
            showToast('Maximum 3 Pine Labs entries allowed', 'error');
        }
    };

    window.createEmptyPinelabsEntry = () => {
        if (pinelabsEntriesDomElement) {
            pinelabsEntriesDomElement.innerHTML = '';
            pinelabsEntriesDomElement.insertAdjacentHTML('beforeend', window.createPinelabsEntryHtml());
            window.checkAndAdjustRemoveButtons();
            if (initialPosIdRequired) {
                const firstPosInput = pinelabsEntriesDomElement.querySelector('.pinelabs-pos-id');
                if (firstPosInput) firstPosInput.setAttribute('required', 'true');
            }
        }
    };

    window.checkAndAdjustRemoveButtons = () => {
        if (!pinelabsEntriesDomElement) return;
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

    // Form Initialization
    const loadStoreNames = async () => {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            userEmail = user?.email || '';
            if (!userEmail) throw new Error('User not authenticated');

            const userRole = await window.checkUserRole();
            let { data, error } = await window.supabaseClient
                .from('user_stores')
                .select('store_name')
                .order('store_name', { ascending: true });

            if (userRole === 'admin' && error && error.code === '42P17') {
                console.warn('RLS recursion detected, attempting admin bypass...');
                const adminClient = new SupabaseClient('https://ecjkxnlejaiupmlyitgu.supabase.co', {
                    anon: 'your-service-role-key', // Replace with actual service role key
                    auth: { persistSession: false }
                });
                ({ data, error } = await adminClient
                    .from('user_stores')
                    .select('store_name')
                    .order('store_name', { ascending: true }));
            }

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
            if (error.code === '42P17') {
                showToast('Store data unavailable due to policy recursion. Contact support or use admin bypass.', 'error');
            } else {
                handleOperationError('Load Store Names', error);
            }
            if (elements.storeName) {
                elements.storeName.innerHTML = '<option value="">No stores available</option>';
            }
        }
    };

    const updateBrandAndFinancierDisplay = (preserveFinancier = false, preserveAppleCode = false) => {
        const brand = elements.brand?.value || '';

        if (elements.appleCodeSection) {
            elements.appleCodeSection.classList.toggle('hidden', brand !== 'Apple');
            if (!preserveAppleCode && brand !== 'Apple' && elements.appleCode) {
                elements.appleCode.value = '';
            }
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
                if (input && !preserveFinancier) {
                    input.value = '';
                }
            }
        });

        if (financier && codeSections[financier]) {
            codeSections[financier].classList.remove('hidden');
        }
    };

    // Form Tab Switching
    window.switchFormTab = (tab) => {
        if (elements.financierTab && elements.pinelabsTab && elements.overallMappingTab &&
            elements.financiersSection && elements.pinelabsSection &&
            elements.overallMainMappingSection && elements.overallPinelabsSection) {
            elements.financierTab.classList.toggle('active', tab === 'financier');
            elements.pinelabsTab.classList.toggle('active', tab === 'pinelabs');
            elements.overallMappingTab.classList.toggle('active', tab === 'overall');
            elements.financiersSection.classList.toggle('hidden', tab !== 'financier');
            elements.pinelabsSection.classList.toggle('hidden', tab !== 'pinelabs');
            elements.overallMainMappingSection.classList.toggle('hidden', tab !== 'overall');
            elements.overallPinelabsSection.classList.toggle('hidden', tab !== 'overall');
            document.getElementById('active-tab').value = tab;
        }
    };

    // Table Population
    window.populateMappingTable = (mappings, tableBody = elements.mappingTableBody, options = { editable: false, isAdminView: false }) => {
        if (!tableBody) {
            console.error('Mapping table body not found');
            return;
        }
        tableBody.innerHTML = '';

        if (!mappings || mappings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="empty-state">No mappings found</td></tr>';
            return;
        }

        mappings.forEach(mapping => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Store Name">${mapping.store_name || ''}</td>
                <td data-label="City">${mapping.city || ''}</td>
                <td data-label="Mail ID">${mapping.mail_id || ''}</td>
                <td data-label="Brand">${mapping.brand || ''}</td>
                <td data-label="Brand Code">${mapping.brand_code || ''}</td>
                <td data-label="Financier">${mapping.financier || ''}</td>
                <td data-label="Financier Code">${mapping.financier_code || ''}</td>
                <td data-label="Requested By">${mapping.requested_by || ''}</td>
                <td data-label="Requested Date">${mapping.requested_date ? new Date(mapping.requested_date).toLocaleDateString() : '-'}</td>
                <td data-label="Actions" class="table-actions-column">
                    ${options.editable ? `
                        <button class="btn-icon-only btn-edit-icon" onclick="window.editMapping(${mapping.id})" aria-label="Edit mapping">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="btn-icon-only btn-delete-icon" onclick="${options.isAdminView ? window.deleteOverallMainMapping(${mapping.id}) : window.deleteMapping(${mapping.id})}" aria-label="Delete mapping">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    ` : '-'}
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Populate brand filter dropdown with all unique brands from the full dataset
        const brandFilter = options.isAdminView ? elements.overallMainMappingsBrandFilter : elements.yourMappingsBrandFilter;
        if (brandFilter) {
            const allBrands = options.isAdminView ? [...new Set(allMappingsData.map(m => m.brand))].sort() : [...new Set(mappings.map(m => m.brand))].sort();
            const currentSelectedValue = brandFilter.value;
            brandFilter.innerHTML = '<option value="">All Brands</option>';
            allBrands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand || 'Unknown';
                brandFilter.appendChild(option);
            });
            // Restore the previously selected value if it still exists
            if (currentSelectedValue && allBrands.includes(currentSelectedValue)) {
                brandFilter.value = currentSelectedValue;
            } else {
                brandFilter.value = '';
            }
            // Only reapply filter if not already in a filter application context
            if (!window.isApplyingFilter) {
                if (options.isAdminView) {
                    applyOverallMainMappingsFilter();
                } else {
                    applyYourMappingsFilter();
                }
            }
        }
    };

    window.populatePinelabsTable = (tableBodyElement, pinelabsData, options = { editable: false, isAdminView: false }) => {
        if (!tableBodyElement) {
            console.error("Target table body for Pine Labs not found.");
            return;
        }

        const table = tableBodyElement.closest('table');
        const colspan = table?.tHead?.rows[0]?.cells.length || 9;
        tableBodyElement.innerHTML = '';

        allPineLabsData = Array.isArray(pinelabsData) ? pinelabsData : [];

        let dataToDisplay = allPineLabsData;
        const searchInput = options.isAdminView ? elements.overallPinelabsSearch : elements.yourPinelabsSearch;
        const brandFilter = options.isAdminView ? elements.overallPinelabsBrandFilter : elements.yourPinelabsBrandFilter;
        const searchTerm = searchInput?.value?.toLowerCase().trim() || '';
        const brandValue = brandFilter?.value || '';

        if (searchTerm || brandValue) {
            dataToDisplay = allPineLabsData.filter(pl => {
                const searchString = [
                    String(pl.finance_mappings?.store_name || ''),
                    String(pl.finance_mappings?.brand || ''),
                    String(pl.pos_id || ''),
                    String(pl.tid || ''),
                    String(pl.serial_no || ''),
                    String(pl.store_id || '')
                ].join(' ').toLowerCase();
                const matchesSearch = searchTerm ? searchString.includes(searchTerm) : true;
                const matchesBrand = brandValue ? pl.finance_mappings?.brand === brandValue : true;
                return matchesSearch && matchesBrand;
            });
        }

        if (dataToDisplay.length > 0) {
            dataToDisplay.forEach(pl => {
                const tr = document.createElement('tr');
                const mainMappingId = pl.finance_mappings?.id || pl.mapping_id;
                let actionsCellHtml = <td class="table-actions-column">-</td>;

                if (options.editable) {
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
                    <td>${storeName}</td>
                    <td data-brand="${brand}">${brand}</td>
                    <td>${pl.pos_id || '-'}</td>
                    <td>${pl.tid || '-'}</td>
                    <td>${pl.serial_no || '-'}</td>
                    <td>${pl.store_id || '-'}</td>
                    ${actionsCellHtml}
                `;
                tableBodyElement.appendChild(tr);
            });
        } else {
            tableBodyElement.innerHTML = <tr><td colspan="${colspan}" class="empty-state">${searchTerm || brandValue ? 'No results found for your search.' : 'No Pine Labs details found.'}</td></tr>;
        }

        // Populate brand filter dropdown with all unique brands
        if (brandFilter) {
            const allBrands = [...new Set(allPineLabsData.map(pl => pl.finance_mappings?.brand).filter(b => b))].sort();
            const currentSelectedValue = brandFilter.value;
            brandFilter.innerHTML = '<option value="">All Brands</option>';
            allBrands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand || 'Unknown';
                brandFilter.appendChild(option);
            });
            // Restore the previously selected value if it still exists
            if (currentSelectedValue && allBrands.includes(currentSelectedValue)) {
                brandFilter.value = currentSelectedValue;
            } else {
                brandFilter.value = '';
            }
        }
    };

    // Filters
    window.filterPineLabsTable = (isAdminView = false) => {
        const tableBodyElement = isAdminView ? elements.overallPinelabsTableBody : elements.pinelabsTableBody;
        if (!tableBodyElement) {
            console.error("Pinelabs table body not found for filtering.");
            return;
        }
        window.populatePinelabsTable(tableBodyElement, allPineLabsData, { editable: true, isAdminView });
    };

    window.applyYourMappingsFilter = () => {
        window.isApplyingFilter = true;
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
        window.isApplyingFilter = false;
    };

    window.applyOverallMainMappingsFilter = () => {
        window.isApplyingFilter = true;
        const searchTerm = elements.overallMainMappingsSearch?.value.toLowerCase() || '';
        const brandFilter = elements.overallMainMappingsBrandFilter?.value || '';
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
            return matchesSearch && matchesBrand;
        });

        window.populateMappingTable(filteredMappings, elements.overallMainMappingTableBody, { editable: true, isAdminView: true });
        window.isApplyingFilter = false;
    };

    // Form Submission
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

            const financier = elements.financier?.value || '';
            let financeCode = '';

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
            if (financier && codeSections[financier]) {
                const input = codeSections[financier].querySelector('input');
                financeCode = input ? input.value || '' : '';
            }

            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const userId = user?.id || '';
            if (!userId) throw new Error('User not authenticated');

            const financierData = {
                store_name: elements.storeName?.value || '',
                city: elements.city?.value || '',
                mail_id: elements.mailId?.value || '',
                brand: elements.brand?.value || '',
                brand_code: elements.appleCode?.value || '',
                financier: financier,
                financier_code: financeCode,
                asm: elements.asm?.value || '',
                requested_by: elements.requestedBy?.value || '',
                requested_date: new Date().toISOString(),
                user_id: userId
            };

            const pinelabsEntries = Array.from(elements.pinelabsEntries.children).map(entry => ({
                id: entry.dataset.id || null,
                pos_id: entry.querySelector('[name="pos_id"]')?.value || '',
                tid: entry.querySelector('[name="tid"]')?.value || '',
                serial_no: entry.querySelector('[name="serial_no"]')?.value || '',
                store_id: entry.querySelector('[name="store_id"]')?.value || '',
            })).filter(entry => entry.pos_id || entry.tid || entry.serial_no || entry.store_id);

            if (!financierData.store_name || !financierData.brand || !financierData.financier || !financierData.city || !financierData.requested_by) {
                throw new Error('Please fill in all required fields');
            }

            let mappingId;
            if (!window.isEditMode) {
                const isDuplicate = await checkForDuplicateMapping(financierData);
                if (isDuplicate) {
                    throw new Error('This mapping already exists');
                }

                const { data, error } = await window.supabaseClient
                    .from('finance_mappings')
                    .insert([financierData])
                    .select('id');
                if (error) throw error;
                if (data && data.length > 0) {
                    mappingId = data[0].id;
                } else {
                    throw new Error('Failed to retrieve inserted mapping ID');
                }
            } else {
                const { data, error } = await window.supabaseClient
                    .from('finance_mappings')
                    .update(financierData)
                    .eq('id', window.currentEditData.id)
                    .select('id')
                    .single();
                if (error) throw error;
                mappingId = data.id;
            }

            // Save Pine Labs details if any entries exist
            if (pinelabsEntries.length > 0) {
                try {
                    await window.updatePineLabsDetails(mappingId, pinelabsEntries);
                } catch (pineLabsError) {
                    console.error('Failed to save Pine Labs details:', pineLabsError);
                    showToast('Warning: Finance data saved, but Pine Labs details failed to save. Please try again.', 'warning');
                    throw pineLabsError;
                }
            }

            // Store the current mailId before reset
            const currentMailId = elements.mailId.value;
            elements.mappingForm.reset();
            elements.pinelabsEntries.innerHTML = '';
            window.createEmptyPinelabsEntry();
            updateBrandAndFinancierDisplay();
            window.switchFormTab('financier');
            window.isEditMode = false;
            elements.cancelEditBtn.classList.add('hidden');
            elements.submitText.textContent = 'Submit Mapping Request';

            // Repopulate mailId after reset
            if (elements.mailId) elements.mailId.value = currentMailId || userEmail;

            const feedbackElement = document.createElement('div');
            feedbackElement.textContent = Mapping ${window.isEditMode ? 'updated' : 'created'} successfully;
            feedbackElement.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #28a745; color: white; padding: 15px; border-radius: 5px; z-index: 10000; font-size: 16px; text-align: center; width: 300px;';
            document.body.appendChild(feedbackElement);
            setTimeout(() => feedbackElement.remove(), 3000);
            await refreshTables();
        } catch (error) {
            handleOperationError('Form Submission', error);
        } finally {
            isSubmitting = false;
            hideLoading();
        }
    };

    // Update Pine Labs Details
    window.updatePineLabsDetails = async (mappingId, pineLabsDetailsArray) => {
        if (!mappingId) {
            showToast('Cannot update Pine Labs: Mapping ID missing.', 'error');
            throw new Error('Mapping ID is required.');
        }

        try {
            const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('User not authenticated.');

            const userRole = await window.checkUserRole();
            if (userRole !== 'admin') {
                const { data: mapping, error: mapErr } = await window.supabaseClient
                    .from('finance_mappings')
                    .select('user_id')
                    .eq('id', mappingId)
                    .single();
                if (mapErr || !mapping) throw new Error('Associated mapping not found or permission denied.');
                if (mapping.user_id !== user.id) throw new Error('Permission denied: You can only update your own mappings.');
            }

            const { data: existingDetailsDb, error: fetchExistingErr } = await window.supabaseClient
                .from('pinelabs_details')
                .select('id, pos_id, tid, serial_no, store_id, mapping_id')
                .eq('mapping_id', mappingId);
            if (fetchExistingErr) throw fetchExistingErr;

            const existingDbMap = new Map(existingDetailsDb?.map(d => [d.id, d]) || []);
            const detailsToInsert = [];
            const detailsToUpdate = [];
            const originalAllPineLabsData = [...allPineLabsData];

            pineLabsDetailsArray.forEach(plFromForm => {
                const isNewEntry = plFromForm.id === null || !existingDbMap.has(plFromForm.id);
                if (isNewEntry) {
                    const isMeaningfulEntry = plFromForm.pos_id || plFromForm.tid || plFromForm.serial_no || plFromForm.store_id;
                    if (isMeaningfulEntry) {
                        detailsToInsert.push({
                            pos_id: plFromForm.pos_id,
                            tid: plFromForm.tid,
                            serial_no: plFromForm.serial_no,
                            store_id: plFromForm.store_id,
                            mapping_id: mappingId,
                            user_id: user.id
                        });
                    }
                } else if (plFromForm.id !== null && existingDbMap.has(plFromForm.id)) {
                    const existingDetail = existingDbMap.get(plFromForm.id);
                    const hasChanged =
                        existingDetail.pos_id !== plFromForm.pos_id ||
                        existingDetail.tid !== plFromForm.tid ||
                        existingDetail.serial_no !== plFromForm.serial_no ||
                        existingDetail.store_id !== plFromForm.store_id;
                    if (hasChanged) {
                        detailsToUpdate.push({
                            id: plFromForm.id,
                            pos_id: plFromForm.pos_id,
                            tid: plFromForm.tid,
                            serial_no: plFromForm.serial_no,
                            store_id: plFromForm.store_id,
                            mapping_id: mappingId
                        });
                    }
                }
            });

            const idsInFormForUpdateAndInsert = new Set(
                pineLabsDetailsArray
                    .filter(d => d.id !== null && existingDbMap.has(d.id))
                    .map(d => d.id)
            );
            const idsToDelete = Array.from(existingDbMap.keys()).filter(dbId => !idsInFormForUpdateAndInsert.has(dbId));

            if (idsToDelete.length > 0) {
                const { error: delErr } = await window.supabaseClient
                    .from('pinelabs_details')
                    .delete()
                    .in('id', idsToDelete);
                if (delErr) throw new Error(Failed to delete Pine Labs entries: ${delErr.message});
                allPineLabsData = allPineLabsData.filter(pl => !idsToDelete.includes(pl.id));
            }

            if (detailsToInsert.length > 0) {
                console.log('Inserting Pine Labs details:', detailsToInsert);
                const { data: insertedData, error: insErr } = await window.supabaseClient
                    .from('pinelabs_details')
                    .insert(detailsToInsert)
                    .select('id, pos_id, tid, serial_no, store_id, mapping_id');
                if (insErr) {
                    console.error('Insert error:', insErr);
                    allPineLabsData = originalAllPineLabsData;
                    throw new Error(Failed to insert Pine Labs entries: ${insErr.message});
                }
                if (insertedData && insertedData.length > 0) {
                    const insertedWithMappingInfo = insertedData.map(item => ({
                        ...item,
                        finance_mappings: null
                    }));
                    allPineLabsData = allPineLabsData.concat(insertedWithMappingInfo);
                }
            }

            for (const detail of detailsToUpdate) {
                const updateObject = {
                    pos_id: detail.pos_id,
                    tid: detail.tid,
                    serial_no: detail.serial_no,
                    store_id: detail.store_id,
                    mapping_id: detail.mapping_id
                };
                const { error: updErr } = await window.supabaseClient
                    .from('pinelabs_details')
                    .update(updateObject)
                    .eq('id', detail.id)
                    .eq('mapping_id', detail.mapping_id);
                if (updErr) {
                    console.error('Update error for ID', detail.id, ':', updErr);
                    allPineLabsData = originalAllPineLabsData;
                    throw new Error(Failed to update Pine Labs entry ${detail.id}: ${updErr.message});
                }
                const index = allPineLabsData.findIndex(pl => pl.id === detail.id);
                if (index > -1) {
                    allPineLabsData[index] = { ...allPineLabsData[index], ...updateObject };
                }
            }

            window.filterPineLabsTable();
            await refreshTables();
        } catch (error) {
            console.error('Update Pine Labs Details error:', error);
            handleOperationError('Update Pine Labs Details', error);
            throw error;
        }
    };

    // Refresh Tables
    const hasEditPermission = async () => {
        try {
            const userRole = await window.checkUserRole();
            return userRole === 'admin' || true; // Allow non-admin users to edit their own mappings
        } catch (error) {
            console.error('Error checking edit permission:', error);
            return false;
        }
    };
    
    const refreshTables = async () => {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            const userId = user?.id || '';
            if (!userId) throw new Error('User not authenticated');
    
            const userRole = await window.checkUserRole();
            let mappings, overallMappings, pinelabsData;
    
            // Fetch user-specific mappings
            const { data: userMappings, error: mappingsError } = await window.supabaseClient
                .from('finance_mappings')
                .select('*')
                .eq('user_id', userId);
            if (mappingsError) throw mappingsError;
            window.navigation.appState.currentMappingsData = userMappings || [];
            window.populateMappingTable(userMappings, elements.mappingTableBody, { editable: await hasEditPermission(), isAdminView: false });
    
            // Skip overall mappings for non-admins
            if (userRole === 'admin') {
                const { data: allMappings, error: allMappingsError } = await window.supabaseClient
                    .from('finance_mappings')
                    .select('*');
                if (allMappingsError) throw allMappingsError;
                allMappingsData = allMappings;
                window.navigation.appState.currentOverallMainMappingsData = allMappings || [];
                window.populateMappingTable(allMappings, elements.overallMainMappingTableBody, { editable: true, isAdminView: true });
            } else {
                if (elements.overallMainMappingTableBody) {
                    elements.overallMainMappingTableBody.innerHTML = '';
                    logDebug('Skipped overallMainMappingTableBody population for non-admin');
                }
            }
    
            const mappingIds = userMappings.map(m => m.id);
            let pinelabsError;
            try {
                ({ data: pinelabsData, error: pinelabsError } = await window.supabaseClient
                    .from('pinelabs_details')
                    .select(`
                        id,
                        pos_id,
                        tid,
                        serial_no,
                        store_id,
                        mapping_id,
                        finance_mappings!pinelabs_details_mapping_id_fkey (brand, id, store_name)
                    `)
                    .in('mapping_id', mappingIds));
            } catch (embedError) {
                console.warn('Embedding failed, falling back to basic query:', embedError.message);
                ({ data: pinelabsData, error: pinelabsError } = await window.supabaseClient
                    .from('pinelabs_details')
                    .select('id, pos_id, tid, serial_no, store_id, mapping_id')
                    .in('mapping_id', mappingIds));
            }
            if (pinelabsError) throw pinelabsError;
    
            const mappingIdMap = new Map(userMappings.map(m => [m.id, m]));
            allPineLabsData = pinelabsData.map(pl => ({
                ...pl,
                finance_mappings: mappingIdMap.get(pl.mapping_id) || pl.finance_mappings || { brand: '', id: null, store_name: '' }
            }));
    
            window.populatePinelabsTable(elements.pinelabsTableBody, allPineLabsData, { editable: await hasEditPermission(), isAdminView: false });
            if (userRole === 'admin') {
                window.populatePinelabsTable(elements.overallPinelabsTableBody, allPineLabsData, { editable: true, isAdminView: true });
            } else {
                if (elements.overallPinelabsTableBody) {
                    elements.overallPinelabsTableBody.innerHTML = '';
                    logDebug('Skipped overallPinelabsTableBody population for non-admin');
                }
            }
        } catch (error) {
            console.error('Refresh Tables failed:', error.message);
            handleOperationError('Refresh Tables', error);
            throw error;
        }
    };

    // Edit and Delete
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
            elements.brand.value = data.brand || '';
            elements.appleCode.value = data.brand_code || '';
            elements.financier.value = data.financier || '';
            elements.city.value = data.city || '';
            elements.asm.value = data.asm || '';
            elements.requestedBy.value = data.requested_by || '';
            updateBrandAndFinancierDisplay(true, true);

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
            if (data.financier && codeSections[data.financier]) {
                const input = codeSections[data.financier].querySelector('input');
                if (input) input.value = data.financier_code || '';
            }

            const { data: pinelabsData, error: pinelabsError } = await window.supabaseClient
                .from('pinelabs_details')
                .select('*')
                .eq('mapping_id', id);

            if (pinelabsError) throw pinelabsError;

            elements.pinelabsEntries.innerHTML = '';
            if (pinelabsData.length > 0) {
                pinelabsData.forEach(entry => {
                    const entryHtml = window.createPinelabsEntryHtml(
                        entry.pos_id,
                        entry.tid,
                        entry.serial_no,
                        entry.store_id,
                        true,
                        entry.id
                    );
                    elements.pinelabsEntries.insertAdjacentHTML('beforeend', entryHtml);
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

    window.editMappingOverall = async (id) => {
        await window.editMapping(id);
    };

    window.editPinelabs = async (id) => {
        try {
            const { data, error } = await window.supabaseClient
                .from('pinelabs_details')
                .select('*, finance_mappings(id, store_name, brand)')
                .eq('id', id)
                .single();

            if (error) throw error;

            window.isEditMode = true;
            window.currentEditData = data;
            elements.submitText.textContent = 'Update Pine Labs Entry';
            elements.cancelEditBtn.classList.remove('hidden');

            elements.storeName.value = data.finance_mappings?.store_name || '';
            elements.brand.value = data.finance_mappings?.brand || '';
            updateBrandAndFinancierDisplay(true, true);

            elements.pinelabsEntries.innerHTML = '';
            const entryHtml = window.createPinelabsEntryHtml(
                data.pos_id,
                data.tid,
                data.serial_no,
                data.store_id,
                true,
                data.id
            );
            elements.pinelabsEntries.insertAdjacentHTML('beforeend', entryHtml);
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
        if (window.navigation?.deleteOverallMainMapping) {
            await window.navigation.deleteOverallMainMapping(id, elements);
        } else {
            console.warn('deleteOverallMainMapping not available, skipping');
        }
    };

    window.deleteSinglePinelabsDetail = async (detailId) => {
        if (!confirm('Delete this specific Pine Labs entry?')) return;
        try {
            const { data: { user } = { user: null } } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('Authentication required.');

            const userRole = await window.checkUserRole();
            if (userRole !== 'admin') {
                const { data: detail, error: fetchErr } = await window.supabaseClient
                    .from('pinelabs_details')
                    .select('mapping_id')
                    .eq('id', detailId)
                    .single();
                if (fetchErr || !detail) throw fetchErr || new Error("Detail not found");

                const { data: mapping, error: mapErr } = await window.supabaseClient
                    .from('finance_mappings')
                    .select('user_id')
                    .eq('id', detail.mapping_id)
                    .single();
                if (mapErr || !mapping) throw mapErr || new Error("Associated mapping not found");

                if (mapping.user_id !== user.id) throw new Error('Permission denied.');
            }

            const { error } = await window.supabaseClient
                .from('pinelabs_details')
                .delete()
                .eq('id', detailId);
            if (error) throw error;

            allPineLabsData = allPineLabsData.filter(pl => pl.id !== detailId);
            window.filterPineLabsTable();
            await refreshTables();
            showToast('Pine Labs entry deleted.', 'success');
        } catch (error) {
            handleOperationError('Delete Pine Labs Entry', error);
        }
    };

    // Excel Export
    const prepareExcelData = (data, type) => {
        if (type === 'mappings') {
            return data.map(item => ({
                'Req ID': item.id,
                'Store Name': item.store_name,
                'City': item.city,
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
                'Store Name': item.finance_mappings?.store_name,
                'Brand': item.finance_mappings?.brand,
                'POS ID': item.pos_id,
                'TID': item.tid,
                'Serial No': item.serial_no,
                'Store ID (PL)': item.store_id,
            }));
        }
    };

    const downloadExcel = (data, filename) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, filename);
    };

    // Event Listeners
    if (elements.mappingForm) {
        elements.mappingForm.addEventListener('submit', window.handleFormSubmit);
    }
    if (elements.brand) {
        elements.brand.addEventListener('change', () => updateBrandAndFinancierDisplay());
    }
    if (elements.financier) {
        elements.financier.addEventListener('change', () => updateBrandAndFinancierDisplay());
    }
    if (elements.addPinelabs) {
        elements.addPinelabs.addEventListener('click', window.addPinelabsEntryWithRemoveButton);
    }
    if (elements.cancelEditBtn) {
        elements.cancelEditBtn.addEventListener('click', () => {
            elements.mappingForm.reset();
            elements.pinelabsEntries.innerHTML = '';
            window.createEmptyPinelabsEntry();
            updateBrandAndFinancierDisplay();
            window.switchFormTab('financier');
            window.isEditMode = false;
            elements.cancelEditBtn.classList.add('hidden');
            elements.submitText.textContent = 'Submit Mapping Request';
        });
    }
    if (elements.yourMappingsSearch) {
        elements.yourMappingsSearch.addEventListener('input', debounce(applyYourMappingsFilter, 300));
    }
    if (elements.yourMappingsBrandFilter) {
        elements.yourMappingsBrandFilter.addEventListener('change', applyYourMappingsFilter);
    }
    if (elements.yourPinelabsSearch) {
        elements.yourPinelabsSearch.addEventListener('input', debounce(() => window.filterPineLabsTable(false), 300));
    }
    if (elements.yourPinelabsBrandFilter) {
        elements.yourPinelabsBrandFilter.addEventListener('change', () => window.filterPineLabsTable(false));
    }
    if (elements.overallMainMappingsSearch) {
        elements.overallMainMappingsSearch.addEventListener('input', debounce(applyOverallMainMappingsFilter, 300));
    }
    if (elements.overallMainMappingsBrandFilter) {
        elements.overallMainMappingsBrandFilter.addEventListener('change', applyOverallMainMappingsFilter);
    }
    if (elements.overallPinelabsSearch) {
        elements.overallPinelabsSearch.addEventListener('input', debounce(() => window.filterPineLabsTable(true), 300));
    }
    if (elements.overallPinelabsBrandFilter) {
        elements.overallPinelabsBrandFilter.addEventListener('change', () => window.filterPineLabsTable(true));
    }
    if (elements.downloadExcel) {
        elements.downloadExcel.addEventListener('click', () => {
            const data = prepareExcelData(window.navigation?.appState?.currentMappingsData || [], 'mappings');
            downloadExcel(data, 'Your_Mappings.xlsx');
        });
    }
    if (elements.downloadOverallMainExcel) {
        elements.downloadOverallMainExcel.addEventListener('click', () => {
            const data = prepareExcelData(window.navigation?.appState?.currentOverallMainMappingsData || [], 'mappings');
            downloadExcel(data, 'Overall_Main_Mappings.xlsx');
        });
    }
    if (elements.downloadOverallPinelabsExcel) {
        elements.downloadOverallPinelabsExcel.addEventListener('click', () => {
            const data = prepareExcelData(allPineLabsData, 'pinelabs');
            downloadExcel(data, 'Overall_Pinelabs_Details.xlsx');
        });
    }

    // Initialization
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        userEmail = user?.email || '';
        if (elements.mailId) elements.mailId.value = userEmail;

        await loadStoreNames();
        window.createEmptyPinelabsEntry();
        updateBrandAndFinancierDisplay();
        window.switchFormTab('financier'); // Default to financier tab
        await refreshTables();
    } catch (error) {   
        handleOperationError('Initial Setup', error);
    }
});

// Add isApplyingFilter to global window object
window.isApplyingFilter = false;
