document.addEventListener('DOMContentLoaded', async () => {
    const mappingForm = document.getElementById('mapping-form');
    const mappingIdInput = document.getElementById('mapping-id');
    const storeNameSelect = document.getElementById('store-name');
    const brandSelect = document.getElementById('brand');
    const appleCodeSection = document.getElementById('apple-code-section');
    const appleCodeInput = document.getElementById('apple-code');
    const financierSelect = document.getElementById('financier');
    const financierCodeSections = {
        bajaj: document.getElementById('bajaj-code-section'),
        hdfc: document.getElementById('hdfc-code-section'),
        hdb: document.getElementById('hdb-code-section'),
        idfc: document.getElementById('idfc-code-section'),
        kotak: document.getElementById('kotak-code-section'),
        tvs: document.getElementById('tvs-code-section'),
        benow: document.getElementById('benow-code-section'),
        icici: document.getElementById('icici-code-section'),
        home_credit: document.getElementById('home-credit-code-section'),
    };
    const stateInput = document.getElementById('state');
    const asmNameInput = document.getElementById('asm-name');
    const mailIdInput = document.getElementById('mail-id');
    const requestedByInput = document.getElementById('requested-by');

    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitLoading = document.getElementById('submit-loading');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    const formSection = document.getElementById('form-section');

    const mappingTableBody = document.getElementById('mapping-table-body');
    const pinelabsTableBody = document.getElementById('pinelabs-table-body');

    const financierTab = document.getElementById('financier-tab');
    const pinelabsTab = document.getElementById('pinelabs-tab');
    const financiersSection = document.getElementById('financiers-section');
    const pinelabsSection = document.getElementById('pinelabs-section');
    const activeTabInput = document.getElementById('active-tab');
    const addPinelabsBtn = document.getElementById('add-pinelabs');
    const pinelabsEntriesContainer = document.getElementById('pinelabs-entries');

    window.isEditMode = false;
    window.currentEditData = null;

    const showLoading = () => {
        submitBtn.disabled = true;
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
    };

    const hideLoading = () => {
        submitBtn.disabled = false;
        submitText.classList.remove('hidden');
        submitLoading.classList.add('hidden');
    };

    const handleOperationError = (operation, error) => {
        const userFriendlyMessage = (error.code === '42501' || (error.message && error.message.includes('policy')))
            ? 'Permission denied. You may not have the necessary rights for this operation.'
            : `${operation} failed: ${error.message || error}`;
        window.showToast(userFriendlyMessage, 'error');
        console.error(`Error during ${operation}:`, error);
        return false;
    };

    const loadStoreNames = async () => {
        try {
            const { data, error } = await window.supabaseClient.from('user_stores').select('store_name');
            if (error) throw error;
            storeNameSelect.innerHTML = '<option value="">Select Store Name</option>';
            data.forEach(store => {
                const option = document.createElement('option');
                option.value = store.store_name;
                option.textContent = store.store_name;
                storeNameSelect.appendChild(option);
            });
        } catch (error) {
            handleOperationError('Loading Store Names', error);
        }
    };

    const updateBrandAndFinancierDisplay = (preserveFinancier = false, preserveAppleCode = false) => {
        const selectedBrand = brandSelect.value;
        console.log('[updateBrandAndFinancierDisplay] Selected brand:', selectedBrand);

        let currentAppleCodeValue = null;
        if (appleCodeInput) {
            currentAppleCodeValue = appleCodeInput.value.trim();
            console.log('[updateBrandAndFinancierDisplay] Preserving Apple code value:', currentAppleCodeValue);
        }

        if (!preserveAppleCode && selectedBrand !== 'Apple') {
            appleCodeSection.classList.add('hidden');
            appleCodeInput.removeAttribute('required');
            appleCodeInput.value = '';
        }

        if (selectedBrand === 'Apple') {
            appleCodeSection.classList.remove('hidden');
            appleCodeInput.setAttribute('required', 'true');
            if (currentAppleCodeValue && (preserveAppleCode || appleCodeInput.value === '')) {
                appleCodeInput.value = currentAppleCodeValue;
                console.log('[updateBrandAndFinancierDisplay] Restored Apple code value:', currentAppleCodeValue);
            }
            console.log('[updateBrandAndFinancierDisplay] Showing Apple code section');
        }

        const selectedFinancier = financierSelect.value;
        console.log('[updateBrandAndFinancierDisplay] Selected financier:', selectedFinancier);

        let currentFinancierCodeValue = null;
        if (selectedFinancier && financierCodeSections[selectedFinancier]) {
            const currentCodeSection = financierCodeSections[selectedFinancier];
            const currentCodeInput = currentCodeSection.querySelector('input[id$="-code"]');
            if (currentCodeInput) {
                currentFinancierCodeValue = currentCodeInput.value.trim();
                console.log(`[updateBrandAndFinancierDisplay] Preserving ${selectedFinancier}-code value:`, currentFinancierCodeValue);
            }
        }

        if (!preserveFinancier) {
            Object.values(financierCodeSections).forEach(sec => {
                if (sec) sec.classList.add('hidden');
            });
            document.querySelectorAll('[id$="-code"]').forEach(input => {
                const inputFinancier = input.id.replace('-code', '');
                if (inputFinancier !== selectedFinancier) {
                    input.removeAttribute('required');
                    input.value = '';
                }
            });

            if (selectedFinancier && financierCodeSections[selectedFinancier]) {
                const codeSection = financierCodeSections[selectedFinancier];
                codeSection.classList.remove('hidden');
                const codeInput = codeSection.querySelector('input[id$="-code"]');
                if (codeInput) {
                    codeInput.setAttribute('required', 'true');
                    if (currentFinancierCodeValue) {
                        codeInput.value = currentFinancierCodeValue;
                        console.log(`[updateBrandAndFinancierDisplay] Restored ${selectedFinancier}-code value:`, currentFinancierCodeValue);
                    }
                    console.log(`[updateBrandAndFinancierDisplay] Showing code section for ${selectedFinancier}`);
                } else {
                    console.warn(`[updateBrandAndFinancierDisplay] Code input for ${selectedFinancier} not found in section`);
                }
            } else if (selectedFinancier) {
                console.warn(`[updateBrandAndFinancierDisplay] Code section for ${selectedFinancier} not found in financierCodeSections`);
            }
        }
    };

    brandSelect.addEventListener('change', () => updateBrandAndFinancierDisplay());
    financierSelect.addEventListener('change', () => {
        console.log('Financier dropdown changed to:', financierSelect.value);
        updateBrandAndFinancierDisplay(false, true);
    });

    window.switchFormTab = (tab) => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        activeTabInput.value = tab;

        if (tab === 'financier') {
            financierTab.classList.add('active');
            financiersSection.classList.remove('hidden');
            pinelabsSection.classList.add('hidden');

            financierSelect.setAttribute('required', 'true');
            pinelabsEntriesContainer.querySelectorAll('input').forEach(input => input.removeAttribute('required'));

            updateBrandAndFinancierDisplay(false, true);
        } else if (tab === 'pinelabs') {
            pinelabsTab.classList.add('active');
            pinelabsSection.classList.remove('hidden');
            financiersSection.classList.add('hidden');

            financierSelect.removeAttribute('required');
            if (pinelabsEntriesContainer) {
                const firstPosId = pinelabsEntriesContainer.querySelector('.pinelabs-pos-id');
                if (firstPosId && !firstPosId.value) firstPosId.setAttribute('required', 'true');
            }

            updateBrandAndFinancierDisplay(true, true);
        }
    };

    financierTab.addEventListener('click', () => window.switchFormTab('financier'));
    pinelabsTab.addEventListener('click', () => window.switchFormTab('pinelabs'));

    if (addPinelabsBtn) {
        addPinelabsBtn.addEventListener('click', () => {
            if (pinelabsEntriesContainer.children.length < 3) {
                window.addPinelabsEntryWithRemoveButton();
            } else {
                window.showToast('Maximum 3 Pine Labs entries allowed.', 'info');
            }
        });
    }

    if (pinelabsEntriesContainer) {
        pinelabsEntriesContainer.addEventListener('click', (event) => {
            if (event.target.closest('.remove-pinelabs-entry')) {
                const entryToRemove = event.target.closest('.pinelabs-entry');
                if (pinelabsEntriesContainer.children.length > 1) {
                    entryToRemove.remove();
                    window.checkAndAdjustRemoveButtons();
                    const firstPosId = pinelabsEntriesContainer.querySelector('.pinelabs-pos-id');
                    if (pinelabsEntriesContainer.children.length === 1 && firstPosId) {
                        firstPosId.setAttribute('required', 'true');
                    }
                }
            }
        });
        pinelabsEntriesContainer.addEventListener('input', (event) => {
            if (event.target.classList.contains('pinelabs-pos-id')) {
                const allPosInputs = pinelabsEntriesContainer.querySelectorAll('.pinelabs-pos-id');
                allPosInputs.forEach((input, index) => {
                    if (input.value.trim() !== '') {
                        input.removeAttribute('required');
                    } else if (index === 0 && activeTabInput.value === 'pinelabs' && allPosInputs.length === 1) {
                        input.setAttribute('required', 'true');
                    } else {
                        input.removeAttribute('required');
                    }
                });
            }
        });
    }

    const resetForm = () => {
        mappingForm.reset();
        mappingIdInput.value = '';
        window.isEditMode = false;
        window.currentEditData = null;
        cancelEditBtn.classList.add('hidden');
        submitText.textContent = 'Submit Mapping Request';

        updateBrandAndFinancierDisplay();
        window.createEmptyPinelabsEntry();
        window.switchFormTab('financier');

        appleCodeInput.value = '';
        formSection.style.display = 'block';
    };

    window.createEmptyPinelabsEntry();
    window.switchFormTab('financier');

    mappingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();

        console.log('[Form Submission] Checking form validity...');
        const isFormValid = mappingForm.checkValidity();
        console.log('[Form Submission] Form validity:', isFormValid);
        console.log('[Form Submission] Form values:', {
            storeName: storeNameSelect.value,
            brand: brandSelect.value,
            financier: financierSelect.value,
            appleCode: appleCodeInput.value,
            state: stateInput.value,
            asm: asmNameInput.value,
            mailId: mailIdInput.value,
            requestedBy: requestedByInput.value,
        });

        if (!isFormValid) {
            console.log('[Form Submission] Form validation failed. Reporting validity...');
            hideLoading();
            window.showToast('Please fill in all required fields.', 'error');
            mappingForm.reportValidity();
            return;
        }

        const activeTab = activeTabInput.value;
        const currentMappingId = mappingIdInput.value;
        console.log('[Form Submission] Active tab:', activeTab);
        console.log('[Form Submission] Current mapping ID:', currentMappingId);

        const { data: { user } = { user: null }, error: userError } = await window.supabaseClient.auth.getUser();
        if (userError || !user) {
            console.log('[Form Submission] Authentication failed:', userError);
            window.showToast('Authentication required.', 'error');
            hideLoading();
            return;
        }

        const commonPayload = {
            store_name: storeNameSelect.value || null,
            brand: brandSelect.value || null,
            state: stateInput.value || null,
            asm: asmNameInput.value || null,
            mail_id: mailIdInput.value || null,
            requested_by: requestedByInput.value || null,
            requested_date: new Date().toISOString(),
            user_id: user.id
        };

        if (brandSelect.value === 'Apple') {
            console.log('[Form Submission] Brand is Apple, capturing Apple code');
            console.log('[Form Submission] Raw Apple code input value:', appleCodeInput.value);
            const appleCodeValue = appleCodeInput.value.trim();
            console.log('[Form Submission] Trimmed Apple code value:', appleCodeValue);
            if (!appleCodeValue) {
                console.warn('[Form Submission] Apple code is empty!');
                window.showToast('Please enter a valid Apple code.', 'error');
                hideLoading();
                return;
            }
            commonPayload.brand_code = appleCodeValue || null;
            console.log('[Form Submission] Setting brand_code in payload to:', commonPayload.brand_code);
        } else {
            commonPayload.brand_code = null;
            console.log('[Form Submission] Brand is not Apple, setting brand_code to null');
        }

        let isFinancierMapping = false;
        let financierDetails = null;
        let isPineLabsMapping = false;
        let pineLabsDetails = [];

        // Always collect Pine Labs details, regardless of the active tab
        const pinelabsEntryElements = pinelabsEntriesContainer.querySelectorAll('.pinelabs-entry');
        console.log('[Form Submission] Collecting Pine Labs entries:', pinelabsEntryElements.length);
        pinelabsEntryElements.forEach(entry => {
            const posId = entry.querySelector('.pinelabs-pos-id').value.trim();
            if (posId) {
                const plId = entry.dataset.id ? parseInt(entry.dataset.id) : null;
                const newEntry = {
                    id: plId,
                    pos_id: posId,
                    tid: entry.querySelector('.pinelabs-tid').value.trim() ?? null,
                    serial_no: entry.querySelector('.pinelabs-serial-no').value.trim() ?? null,
                    store_id: entry.querySelector('.pinelabs-store-id').value.trim() ?? null,
                };
                pineLabsDetails.push(newEntry);
                console.log('[Form Submission] Added Pine Labs entry:', newEntry);
            }
        });

        if (pineLabsDetails.length > 0) {
            isPineLabsMapping = true;
            console.log('[Form Submission] Pine Labs details collected:', JSON.stringify(pineLabsDetails, null, 2));
        } else {
            console.log('[Form Submission] No valid Pine Labs entries found');
        }

        // Handle financier details if the financier tab is active or if financier fields are filled
        const normalizedFinancier = financierSelect.value;
        if (activeTab === 'financier' || (normalizedFinancier && normalizedFinancier.trim() !== '')) {
            isFinancierMapping = true;

            const financierOptions = Array.from(financierSelect.options).map(opt => opt.value);
            console.log('[Form Submission] Available financier options:', financierOptions);
            console.log('[Form Submission] Selected financier:', normalizedFinancier);

            if (!normalizedFinancier || normalizedFinancier.trim() === "") {
                console.log('[Form Submission] Financier is empty or invalid');
                hideLoading();
                window.showToast("Financier cannot be empty. Please select an option.", "error");
                return;
            }

            const codeSection = financierCodeSections[normalizedFinancier];
            let financierCodeValue = null;

            if (codeSection) {
                console.log(`[Form Submission] Found code section for ${normalizedFinancier}:`, codeSection);
                const codeInput = codeSection.querySelector('input[id$="-code"]');
                if (codeInput) {
                    console.log(`[Form Submission] Found code input for ${normalizedFinancier}:`, codeInput);
                    console.log(`[Form Submission] Raw value of ${normalizedFinancier}-code input:`, codeInput.value);
                    financierCodeValue = codeInput.value.trim();
                    console.log(`[Form Submission] Trimmed ${normalizedFinancier}-code value:`, financierCodeValue);
                    if (!financierCodeValue) {
                        console.warn(`[Form Submission] Financier code for ${normalizedFinancier} is empty!`);
                        window.showToast(`Please enter a valid ${normalizedFinancier} code.`, 'error');
                        hideLoading();
                        return;
                    }
                } else {
                    console.error(`[Form Submission] Code input for ${normalizedFinancier} not found in section`);
                    hideLoading();
                    window.showToast(`Code input for ${normalizedFinancier} not found.`, 'error');
                    return;
                }
            } else {
                console.error(`[Form Submission] Code section for ${normalizedFinancier} not found in financierCodeSections`);
                hideLoading();
                window.showToast(`Configuration error: Code section for ${normalizedFinancier} not found.`, 'error');
                return;
            }

            financierDetails = {
                financier: normalizedFinancier,
                financier_code: financierCodeValue || null
            };
            commonPayload.financier = normalizedFinancier;
            commonPayload.financier_code = financierCodeValue || null;
            console.log(`[Form Submission] Setting financier_code in payload to:`, commonPayload.financier_code);
        } else {
            commonPayload.financier = "none";
            commonPayload.financier_code = null;
            console.log('[Form Submission] No financier details provided, setting financier to "none"');
        }

        // If only Pine Labs details are provided and we're not in edit mode, prevent submission
        if (isPineLabsMapping && !isFinancierMapping && !window.isEditMode) {
            console.log('[Form Submission] Pine Labs submission without financier details and not in edit mode');
            hideLoading();
            window.showToast('Please provide financier details or edit an existing mapping to add Pine Labs details.', 'error');
            window.switchFormTab('financier');
            return;
        }

        try {
            console.log('[Form Submission] Final payload being sent to Supabase:', JSON.stringify(commonPayload, null, 2));
            let mappingRecord;

            if (window.isEditMode && currentMappingId) {
                submitText.textContent = 'Updating Mapping...';
                console.log('[Form Submission] Updating existing mapping...');

                const userRole = await window.checkUserRole();
                if (userRole !== 'admin') {
                    const { data: existingMapping, error: fetchErr } = await window.supabaseClient.from('finance_mappings').select('user_id').eq('id', currentMappingId).single();
                    if (fetchErr || !existingMapping) throw fetchErr || new Error("Mapping not found or permission denied.");
                    if (existingMapping.user_id !== user.id) throw new Error('Permission denied: You can only edit your own mappings.');
                }

                const { data, error } = await window.supabaseClient
                    .from('finance_mappings')
                    .update(commonPayload)
                    .eq('id', currentMappingId)
                    .select()
                    .single();

                if (error) {
                    console.error('[Form Submission] Update error:', error);
                    throw new Error(`Database update failed: ${error.message || error}`);
                }
                mappingRecord = data;
                console.log('[Form Submission] Updated mapping record from DB:', JSON.stringify(mappingRecord, null, 2));
                window.showToast('Mapping updated successfully!', 'success');

            } else if (isFinancierMapping) {
                submitText.textContent = 'Submitting...';
                console.log('[Form Submission] Inserting new mapping...');

                const { data, error } = await window.supabaseClient
                    .from('finance_mappings')
                    .insert([commonPayload])
                    .select()
                    .single();

                if (error) {
                    console.error('[Form Submission] Insert error:', error);
                    throw new Error(`Database insert failed: ${error.message || error}`);
                }
                mappingRecord = data;
                console.log('[Form Submission] Inserted mapping record from DB:', JSON.stringify(mappingRecord, null, 2));
                window.showToast('Mapping request submitted successfully!', 'success');
            } else {
                console.log('[Form Submission] No new mapping to insert (likely Pine Labs-only submission in edit mode)');
                // Fetch the existing mapping record if in edit mode
                if (currentMappingId) {
                    const { data, error } = await window.supabaseClient
                        .from('finance_mappings')
                        .select('*')
                        .eq('id', currentMappingId)
                        .single();
                    if (error) throw error;
                    mappingRecord = data;
                } else {
                    throw new Error('No mapping ID available for Pine Labs submission.');
                }
            }

            if (mappingRecord && isPineLabsMapping) {
                console.log('[Form Submission] Updating Pine Labs details for mapping ID:', mappingRecord.id);
                console.log('[Form Submission] Pine Labs details to be updated:', JSON.stringify(pineLabsDetails, null, 2));
                try {
                    await window.updatePineLabsDetails(mappingRecord.id, pineLabsDetails);
                    console.log('[Form Submission] Successfully called updatePineLabsDetails');
                } catch (pineLabsError) {
                    console.error('[Form Submission] Failed to update Pine Labs details:', pineLabsError);
                    window.showToast(`Failed to save Pine Labs details: ${pineLabsError.message}`, 'error');
                    throw pineLabsError; // Re-throw to ensure the form doesn't reset on failure
                }
            }

            console.log('[Form Submission] Resetting form...');
            resetForm();

            console.log('[Form Submission] Reloading mappings...');
            await window.loadMappings();
            await window.loadPineLabsMappings();
            await window.refreshOverallTables();

        } catch (error) {
            console.error('[Form Submission] Error details:', error);
            handleOperationError(window.isEditMode ? 'Updating Mapping' : 'Submitting Mapping', error);
        } finally {
            hideLoading();
        }
    });

    window.editMapping = async (id) => {
        window.currentEditData = null;
        try {
            const { data: { user } = { user: null }, error: userError } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('Authentication required for editing.');

            const userRole = await window.checkUserRole();
            let query = window.supabaseClient.from('finance_mappings').select(`*, pinelabs_details!pinelabs_details_mapping_id_fkey(*)`).eq('id', id);

            if (userRole !== 'admin') {
                query = query.eq('user_id', user.id);
            }
            query = query.single();

            const { data: mapping, error } = await query;
            if (error) throw error;
            if (!mapping) throw new Error('Mapping not found or you do not have permission.');

            console.log('[Edit Mapping] Loaded mapping for edit:', mapping);

            window.currentEditData = mapping;
            window.isEditMode = true;
            cancelEditBtn.classList.remove('hidden');
            submitText.textContent = 'Update Mapping';
            formSection.style.display = 'block';
            window.scrollTo({ top: formSection.offsetTop, behavior: 'smooth' });

            mappingIdInput.value = mapping.id;
            storeNameSelect.value = mapping.store_name || '';
            brandSelect.value = mapping.brand || '';
            stateInput.value = mapping.state || '';
            asmNameInput.value = mapping.asm || '';
            mailIdInput.value = mapping.mail_id || '';
            requestedByInput.value = mapping.requested_by || '';

            if (mapping.brand === 'Apple' && mapping.brand_code) {
                appleCodeSection.classList.remove('hidden');
                appleCodeInput.value = mapping.brand_code;
                appleCodeInput.setAttribute('required', 'true');
                console.log('[Edit Mapping] Set Apple code to:', mapping.brand_code);
            } else {
                appleCodeSection.classList.add('hidden');
                appleCodeInput.value = '';
                appleCodeInput.removeAttribute('required');
            }

            if (mapping.financier && mapping.financier !== '' && mapping.financier !== 'none') {
                window.switchFormTab('financier');
                financierSelect.value = mapping.financier || '';
                console.log('[Edit Mapping] Setting financier dropdown to:', mapping.financier);

                updateBrandAndFinancierDisplay();

                const selectedFinancierKey = mapping.financier;
                const codeSection = financierCodeSections[selectedFinancierKey];
                if (codeSection) {
                    const codeInput = codeSection.querySelector('input[id$="-code"]');
                    if (codeInput) {
                        const codeValue = mapping.financier_code || '';
                        codeInput.value = codeValue;
                        codeInput.setAttribute('required', 'true');
                        console.log(`[Edit Mapping] Set ${selectedFinancierKey}-code to:`, codeValue);
                    }
                }
                window.createEmptyPinelabsEntry();
            } else if (mapping.pinelabs_details && mapping.pinelabs_details.length > 0) {
                window.switchFormTab('pinelabs');
                pinelabsEntriesContainer.innerHTML = '';
                mapping.pinelabs_details.sort((a, b) => a.id - b.id);

                mapping.pinelabs_details.forEach(pl => {
                    pinelabsEntriesContainer.insertAdjacentHTML('beforeend', window.createPinelabsEntryHtml(
                        pl.pos_id || '', pl.tid || '', pl.serial_no || '', pl.store_id || '', true, pl.id
                    ));
                });
                window.checkAndAdjustRemoveButtons();
            } else {
                window.switchFormTab('financier');
                financierSelect.value = '';
                window.createEmptyPinelabsEntry();
            }

            updateBrandAndFinancierDisplay();
            mappingForm.reportValidity();

        } catch (error) {
            handleOperationError('Loading mapping for edit', error);
            resetForm();
            formSection.style.display = 'none';
        }
    };

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            resetForm();
            formSection.style.display = 'none';
        });
    }

    let currentMappingsData = [];
    let currentPinelabsData = [];

    window.loadMappings = async () => {
        mappingTableBody.innerHTML = '<tr><td colspan="11" class="loading text-center">Loading your mappings...</td></tr>';

        try {
            const { data: { user } = { user: null }, error: userError } = await window.supabaseClient.auth.getUser();
            if (userError || !user) {
                console.error('User authentication error:', userError);
                mappingTableBody.innerHTML = `<tr><td colspan="11" class="empty-state">Please log in to view your mappings.</td></tr>`;
                return;
            }

            const { data: mappings, error: mappingsError } = await window.supabaseClient
                .from('finance_mappings')
                .select(`
                    id,
                    store_name,
                    asm,
                    mail_id,
                    brand,
                    brand_code,
                    financier,
                    financier_code,
                    state,
                    requested_by,
                    requested_date,
                    user_id
                `)
                .eq('user_id', user.id)
                .order('id', { ascending: false });

            if (mappingsError) {
                console.error('Error fetching finance mappings:', mappingsError);
                throw mappingsError;
            }

            if (!mappings || mappings.length === 0) {
                console.warn('No finance mappings found for user.');
                mappingTableBody.innerHTML = `<tr><td colspan="11" class="empty-state">No matching mapping requests found.</td></tr>`;
            }

            currentMappingsData = mappings || [];
            console.log('Fetched mappings:', JSON.stringify(currentMappingsData, null, 2));
            populateMappingTable(currentMappingsData);
        } catch (error) {
            handleOperationError('Loading user mappings', error);
            mappingTableBody.innerHTML = `<tr><td colspan="11" class="empty-state">Error loading your data.</td></tr>`;
        } finally {
            applyYourMappingsFilters();
        }
    };

    window.loadPineLabsMappings = async () => {
        pinelabsTableBody.innerHTML = '<tr><td colspan="9" class="loading text-center">Loading your Pine Labs details...</td></tr>';
        try {
            const { data: { user } = { user: null }, error: userError } = await window.supabaseClient.auth.getUser();
            if (userError || !user) {
                console.error('User authentication error:', userError);
                pinelabsTableBody.innerHTML = `<tr><td colspan="9" class="empty-state">Please log in to view your Pine Labs details.</td></tr>`;
                return;
            }
            const { data: mappings, error: mappingsError } = await window.supabaseClient
                .from('finance_mappings')
                .select(`
                    id,
                    store_name,
                    asm,
                    mail_id,
                    brand,
                    brand_code,
                    financier,
                    financier_code,
                    state,
                    requested_by,
                    requested_date,
                    user_id,
                    pinelabs_details!pinelabs_details_mapping_id_fkey(*)
                `)
                .eq('user_id', user.id)
                .order('id', { ascending: false });

            if (mappingsError) {
                console.error('Error fetching finance mappings:', mappingsError);
                throw mappingsError;
            }

            if (!mappings || mappings.length === 0) {
                console.warn('No finance mappings found for user.');
                pinelabsTableBody.innerHTML = `<tr><td colspan="9" class="empty-state">No matching mapping requests found.</td></tr>`;
            }
            currentPineLabsMappingsData = mappings || [];
            currentPinelabsData = [];
            currentPineLabsMappingsData.forEach(mapping => {
                if (mapping.pinelabs_details && mapping.pinelabs_details.length > 0) {
                    mapping.pinelabs_details.forEach(pl => {
                        currentPinelabsData.push({
                            ...pl,
                            finance_mappings: {
                                id: mapping.id,
                                store_name: mapping.store_name,
                                brand: mapping.brand
                            }
                        });
                    });
                }
            });

            window.populatePinelabsTable(pinelabsTableBody, currentPinelabsData, { editable: true });
        } catch (error) {
            handleOperationError('Loading user mappings', error);
            pinelabsTableBody.innerHTML = `<tr><td colspan="9" class="empty-state">Error loading your data.</td></tr>`;
        } finally {
            applyYourPinelabsFilters();
        }
    };

    const populateMappingTable = (mappingsToDisplay) => {
        mappingTableBody.innerHTML = '';
        const colSpan = mappingTableBody.parentElement?.tHead?.rows[0]?.cells.length || 11;

        if (mappingsToDisplay && mappingsToDisplay.length > 0) {
            mappingsToDisplay.forEach(row => {
                const tr = mappingTableBody.insertRow();
                let financierDisplay = row.financier && row.financier !== 'none' 
                    ? row.financier.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
                    : '-';
                let financierCodeDisplay = row.financier_code || '-';

                console.log(`Row ${row.id} - Raw financier: ${row.financier}, Raw financier_code:`, row.financier_code);

                const requestedDate = row.requested_date ? new Date(row.requested_date) : null;
                const formattedDate = requestedDate ? requestedDate.toLocaleDateString() : '-';

                tr.innerHTML = `<td class="table-id-column">${row.id}</td><td>${row.store_name ?? '-'}</td><td>${row.asm ?? '-'}</td><td>${row.mail_id ?? '-'}</td><td data-brand="${row.brand ?? ''}">${row.brand ?? '-'}</td><td>${row.brand === 'Apple' ? (row.brand_code ?? '-') : '-'}</td><td>${financierDisplay}</td><td>${financierCodeDisplay}</td><td class="table-date-column">${formattedDate}</td><td>${row.requested_by ?? '-'}</td><td class="table-actions-column">
                    <div class="action-buttons">
                    <button class="btn btn-icon-only btn-edit-icon" onclick="window.editMapping(${row.id})" title="Edit"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button class="btn btn-icon-only btn-delete-icon" onclick="window.deleteMapping(${row.id})" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                    </td>`;
            });
        } else {
            const noDataFilterRow = document.getElementById('mapping-table-body-no-data-filter');
            if (noDataFilterRow) noDataFilterRow.remove();
            mappingTableBody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">No matching mapping requests found.</td></tr>`;
        }
    };

    window.deleteMapping = async (id) => {
        if (!confirm('Are you sure you want to delete this mapping? All associated Pine Labs details will also be deleted.')) {
            return;
        }

        try {
            showLoading();

            const { data: { user } = { user: null }, error: userError } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('Authentication required.');

            const userRole = await window.checkUserRole();
            if (userRole !== 'admin') {
                const { data: existingMapping, error: fetchErr } = await window.supabaseClient.from('finance_mappings').select('user_id').eq('id', id).single();
                if (fetchErr || !existingMapping) throw fetchErr || new Error("Mapping not found or permission denied.");
                if (existingMapping.user_id !== user.id) throw new Error('Permission denied: You can only delete your own mappings.');
            }

            const { error: pinelabsDeleteError } = await window.supabaseClient
                .from('pinelabs_details')
                .delete()
                .eq('mapping_id', id);

            if (pinelabsDeleteError) {
                console.warn('Could not delete associated Pine Labs details (possibly due to RLS/permissions, or they didn\'t exist):', pinelabsDeleteError.message);
            }

            const { error: mappingDeleteError } = await window.supabaseClient
                .from('finance_mappings')
                .delete()
                .eq('id', id);

            if (mappingDeleteError) throw mappingDeleteError;

            window.showToast('Mapping and associated details deleted successfully!', 'success');
            resetForm();
            await window.loadMappings();
            await window.refreshOverallTables();

        } catch (error) {
            handleOperationError('Deleting Mapping', error);
        } finally {
            hideLoading();
        }
    };

    const yourMappingsSearchInput = document.getElementById('yourMappingsSearch');
    const yourMappingsBrandFilter = document.getElementById('yourMappingsBrandFilter');

    const applyYourMappingsFilters = () => {
        const searchTerm = yourMappingsSearchInput.value.toLowerCase();
        const brandFilter = yourMappingsBrandFilter.value;

        const filteredData = currentMappingsData.filter(row => {
            let matchesSearch = searchTerm === '' ||
                (row.store_name?.toLowerCase().includes(searchTerm)) ||
                (row.asm?.toLowerCase().includes(searchTerm)) ||
                (row.mail_id?.toLowerCase().includes(searchTerm)) ||
                (row.brand?.toLowerCase().includes(searchTerm)) ||
                (row.financier?.toLowerCase().includes(searchTerm)) ||
                (row.requested_by?.toLowerCase().includes(searchTerm)) ||
                (row.id?.toString().includes(searchTerm));

            const matchesBrand = brandFilter === '' || row.brand === brandFilter;
            return matchesSearch && matchesBrand;
        });

        populateMappingTable(filteredData);
    };

    if (yourMappingsSearchInput) yourMappingsSearchInput.addEventListener('input', applyYourMappingsFilters);
    if (yourMappingsBrandFilter) yourMappingsBrandFilter.addEventListener('change', applyYourMappingsFilters);

    const yourPinelabsSearchInput = document.getElementById('yourPinelabsSearch');
    const yourPinelabsBrandFilter = document.getElementById('yourPinelabsBrandFilter');

    const applyYourPinelabsFilters = () => {
        const searchTerm = yourPinelabsSearchInput.value.toLowerCase();
        const brandFilter = yourPinelabsBrandFilter.value;
        let filteredData = currentPinelabsData.filter(pl => {
            let matchesSearch = searchTerm === '' ||
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
        window.populatePinelabsTable(pinelabsTableBody, filteredData, { editable: true });

        const actualDisplayedRows = pinelabsTableBody.querySelectorAll('tr:not([id^="pinelabs-table-body-"])').length;
        const colSpan = pinelabsTableBody.parentElement?.tHead?.rows[0]?.cells.length || 9;
        const existingNoDataFilter = document.getElementById('pinelabs-table-body-no-data-filter');

        if (actualDisplayedRows === 0) {
            if (!existingNoDataFilter) {
                const tr = document.createElement('tr');
                tr.id = 'pinelabs-table-body-no-data-filter';
                tr.innerHTML = `<td colspan="${colSpan}" class="empty-state">No matching Pine Labs details found.</td>`;
                pinelabsTableBody.appendChild(tr);
            } else {
                existingNoDataFilter.style.display = '';
            }
        } else {
            if (existingNoDataFilter) existingNoDataFilter.remove();
        }
    };

    if (yourPinelabsSearchInput) yourPinelabsSearchInput.addEventListener('input', applyYourPinelabsFilters);
    if (yourPinelabsBrandFilter) yourPinelabsBrandFilter.addEventListener('change', applyYourPinelabsFilters);

    // Overall Mappings (Admin) Table Logic
    let currentOverallData = [];
    let currentOverallPinelabsData = [];

    window.refreshOverallTables = async () => {
        const overallTableBody = document.getElementById('overall-table-body');
        const overallPinelabsTableBody = document.getElementById('overall-pinelabs-table-body');

        if (!overallTableBody || !overallPinelabsTableBody) return;

        try {
            const userRole = await window.checkUserRole();
            if (userRole !== 'admin') {
                overallTableBody.innerHTML = `<tr><td colspan="11" class="empty-state">You do not have permission to view this data.</td></tr>`;
                overallPinelabsTableBody.innerHTML = `<tr><td colspan="9" class="empty-state">You do not have permission to view this data.</td></tr>`;
                return;
            }

            const { data: mappings, error } = await window.supabaseClient
                .from('finance_mappings')
                .select(`
                    id,
                    store_name,
                    asm,
                    mail_id,
                    brand,
                    brand_code,
                    financier,
                    financier_code,
                    state,
                    requested_by,
                    requested_date,
                    user_id,
                    pinelabs_details!pinelabs_details_mapping_id_fkey(*)
                `)
                .order('id', { ascending: false });

            if (error) throw error;

            currentOverallData = mappings || [];
            currentOverallPinelabsData = [];
            currentOverallData.forEach(mapping => {
                if (mapping.pinelabs_details && mapping.pinelabs_details.length > 0) {
                    mapping.pinelabs_details.forEach(pl => {
                        currentOverallPinelabsData.push({
                            ...pl,
                            finance_mappings: {
                                id: mapping.id,
                                store_name: mapping.store_name,
                                brand: mapping.brand
                            }
                        });
                    });
                }
            });

            window.applyOverallFilters();
            window.applyOverallPinelabsFilters();

        } catch (error) {
            handleOperationError('Loading overall mappings', error);
            overallTableBody.innerHTML = `<tr><td colspan="11" class="empty-state">Error loading overall data.</td></tr>`;
            overallPinelabsTableBody.innerHTML = `<tr><td colspan="9" class="empty-state">Error loading overall Pine Labs data.</td></tr>`;
        }
    };

    window.populateOverallTable = (mappingsToDisplay) => {
        const overallTableBody = document.getElementById('overall-table-body');
        if (!overallTableBody) return;

        overallTableBody.innerHTML = '';
        const colSpan = overallTableBody.parentElement?.tHead?.rows[0]?.cells.length || 11;

        if (mappingsToDisplay && mappingsToDisplay.length > 0) {
            mappingsToDisplay.forEach(row => {
                const tr = overallTableBody.insertRow();
                let financierDisplay = row.financier && row.financier !== 'none' 
                    ? row.financier.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
                    : '-';
                let financierCodeDisplay = row.financier_code || '-';

                const requestedDate = row.requested_date ? new Date(row.requested_date) : null;
                const formattedDate = requestedDate ? requestedDate.toLocaleDateString() : '-';

                tr.innerHTML = `<td class="table-id-column">${row.id}</td><td>${row.store_name ?? '-'}</td><td>${row.asm ?? '-'}</td><td>${row.mail_id ?? '-'}</td><td data-brand="${row.brand ?? ''}">${row.brand ?? '-'}</td><td>${row.brand === 'Apple' ? (row.brand_code ?? '-') : '-'}</td><td>${financierDisplay}</td><td>${financierCodeDisplay}</td><td class="table-date-column">${formattedDate}</td><td>${row.requested_by ?? '-'}</td><td class="table-actions-column">-</td>`;
            });
        } else {
            overallTableBody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">No matching mapping requests found.</td></tr>`;
        }
    };

    window.applyOverallFilters = () => {
        const overallSearchInput = document.getElementById('overallSearch');
        const overallBrandFilter = document.getElementById('overallBrandFilter');
        const searchTerm = overallSearchInput?.value.toLowerCase() || '';
        const brandFilter = overallBrandFilter?.value || '';

        const filteredData = currentOverallData.filter(row => {
            let matchesSearch = searchTerm === '' ||
                (row.store_name?.toLowerCase().includes(searchTerm)) ||
                (row.asm?.toLowerCase().includes(searchTerm)) ||
                (row.mail_id?.toLowerCase().includes(searchTerm)) ||
                (row.brand?.toLowerCase().includes(searchTerm)) ||
                (row.financier?.toLowerCase().includes(searchTerm)) ||
                (row.requested_by?.toLowerCase().includes(searchTerm)) ||
                (row.id?.toString().includes(searchTerm));

            const matchesBrand = brandFilter === '' || row.brand === brandFilter;
            return matchesSearch && matchesBrand;
        });

        window.populateOverallTable(filteredData);
    };

    window.applyOverallPinelabsFilters = () => {
        const overallPinelabsTableBody = document.getElementById('overall-pinelabs-table-body');
        const overallBrandFilter = document.getElementById('overallBrandFilter');
        const overallPinelabsSearchInput = document.getElementById('overallPinelabsSearch');
        const searchTerm = overallPinelabsSearchInput?.value.toLowerCase() || '';
        const brandFilter = overallBrandFilter?.value || '';

        let filteredData = currentOverallPinelabsData.filter(pl => {
            let matchesSearch = searchTerm === '' ||
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

        window.populatePinelabsTable(overallPinelabsTableBody, filteredData, { editable: false, isAdminView: true });
    };

    const overallSearchInput = document.getElementById('overallSearch');
    const overallBrandFilter = document.getElementById('overallBrandFilter');
    const overallPinelabsSearchInput = document.getElementById('overallPinelabsSearch');

    if (overallSearchInput) overallSearchInput.addEventListener('input', window.applyOverallFilters);
    if (overallBrandFilter) {
        overallBrandFilter.addEventListener('change', () => {
            window.applyOverallFilters();
            window.applyOverallPinelabsFilters();
        });
    }
    if (overallPinelabsSearchInput) overallPinelabsSearchInput.addEventListener('input', window.applyOverallPinelabsFilters);

    const downloadExcelBtn = document.getElementById('download-excel');
    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', async () => {
            try {
                if (typeof XLSX === 'undefined') throw new Error('Excel library not loaded.');

                const { data: { user } = { user: null }, error: userError } = await window.supabaseClient.auth.getUser();
                if (!user) {
                    window.showToast('Please log in to download data.', 'info');
                    return;
                }

                const userRole = await window.checkUserRole();
                let financeDataToExport = [];
                let pinelabsDataToExport = [];

                if (userRole === 'admin') {
                    // For admins, use the filtered data from the Overall Mappings and Overall Pine Labs tables
                    const overallBrandFilterValue = overallBrandFilter?.value || '';

                    // Filter finance data (currentOverallData) based on the brand filter
                    financeDataToExport = currentOverallData.filter(row => {
                        const matchesBrand = overallBrandFilterValue === '' || row.brand === overallBrandFilterValue;
                        return matchesBrand;
                    });

                    // Filter Pine Labs data (currentOverallPinelabsData) based on the brand filter
                    pinelabsDataToExport = currentOverallPinelabsData.filter(pl => {
                        const matchesBrand = overallBrandFilterValue === '' || pl.finance_mappings?.brand === overallBrandFilterValue;
                        return matchesBrand;
                    });

                    console.log('[Excel Download] Admin role - Filtered finance data:', financeDataToExport.length, 'rows');
                    console.log('[Excel Download] Admin role - Filtered Pine Labs data:', pinelabsDataToExport.length, 'rows');
                } else {
                    // For non-admins, use the user's own data (already filtered by user_id in loadMappings and loadPineLabsMappings)
                    financeDataToExport = currentMappingsData;
                    pinelabsDataToExport = currentPinelabsData;

                    console.log('[Excel Download] User role - Finance data:', financeDataToExport.length, 'rows');
                    console.log('[Excel Download] User role - Pine Labs data:', pinelabsDataToExport.length, 'rows');
                }

                // Prepare finance data for export
                const financeExportData = financeDataToExport.map(m => {
                    let financierExcelDisplay = m.financier && m.financier !== 'none' 
                        ? m.financier.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
                        : '-';
                    if (m.financier === 'none') {
                        financierExcelDisplay = '-';
                    }

                    const pinelabsString = m.pinelabs_details?.map(p => 
                        `POS:${p.pos_id || 'N/A'}, TID:${p.tid || 'N/A'}, SerialNo:${p.serial_no || 'N/A'}, StoreID(PL):${p.store_id || 'N/A'}`
                    ).join('; ') || '-';

                    return {
                        ID: m.id,
                        'Store Name': m.store_name || '-',
                        'State': m.state || '-',
                        'ASM': m.asm || '-',
                        'Mail ID': m.mail_id || '-',
                        'Brand': m.brand || '-',
                        'Brand Code (Apple)': m.brand === 'Apple' ? (m.brand_code || '-') : '-',
                        'Financier': financierExcelDisplay,
                        'Financier Code': m.financier_code || '-',
                        'Pine Labs Details': pinelabsString,
                        'Requested By': m.requested_by || '-',
                        'Requested Date': m.requested_date ? new Date(m.requested_date).toLocaleDateString() : '-'
                    };
                });

                // Prepare Pine Labs data for export
                const pinelabsExportData = pinelabsDataToExport.map(pl => {
                    const storeName = pl.finance_mappings?.store_name || '-';
                    const brand = pl.finance_mappings?.brand || '-';
                    const mappingIdDisplay = pl.mapping_id || 'N/A';

                    return {
                        'PL ID': pl.id || '-',
                        'Mapping ID': mappingIdDisplay,
                        'Store Name': storeName,
                        'Brand': brand,
                        'POS ID': pl.pos_id || '-',
                        'TID': pl.tid || '-',
                        'Serial No': pl.serial_no || '-',
                        'Store ID (PL)': pl.store_id || '-'
                    };
                });

                // Check if there's data to export
                if (financeExportData.length === 0 && pinelabsExportData.length === 0) {
                    window.showToast('No data to export.', 'info');
                    return;
                }

                // Create a new workbook
                const wb = XLSX.utils.book_new();

                // Add Finance Mappings sheet
                if (financeExportData.length > 0) {
                    const financeWs = XLSX.utils.json_to_sheet(financeExportData);
                    XLSX.utils.book_append_sheet(wb, financeWs, "Finance Mappings");
                } else {
                    const financeWs = XLSX.utils.json_to_sheet([{ 'Message': 'No finance mappings data available after filtering.' }]);
                    XLSX.utils.book_append_sheet(wb, financeWs, "Finance Mappings");
                }

                // Add Pine Labs Details sheet
                if (pinelabsExportData.length > 0) {
                    const pinelabsWs = XLSX.utils.json_to_sheet(pinelabsExportData);
                    XLSX.utils.book_append_sheet(wb, pinelabsWs, "Pine Labs Details");
                } else {
                    const pinelabsWs = XLSX.utils.json_to_sheet([{ 'Message': 'No Pine Labs details available after filtering.' }]);
                    XLSX.utils.book_append_sheet(wb, pinelabsWs, "Pine Labs Details");
                }

                // Generate and download the Excel file
                XLSX.writeFile(wb, `Mappings_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
                window.showToast('Excel file downloaded successfully!', 'success');

            } catch (err) {
                window.showToast('Excel export failed: ' + err.message, 'error');
                console.error('[Excel Download] Error:', err);
            }
        });
    }
    
    window.initializeApp = async () => {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                const { error } = await window.supabaseClient.auth.signOut();
                if (error) {
                    window.showToast('Logout failed: ' + error.message, 'error');
                } else {
                    window.location.href = 'login.html';
                }
            });
        }
        await loadStoreNames();
        updateBrandAndFinancierDisplay();

        formSection.style.display = 'block';
        await window.switchMainTab('paper');
    };

    await window.initializeApp();
    await window.loadMappings();
    await window.loadPineLabsMappings();
});