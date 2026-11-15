        /* =========================
 STORAGE KEYS
 ========================= */

        const CONVERSATIONS_KEY = 'vllm_conversations'

        const ENDPOINT_KEY = 'vllm_endpoint'

        const API_KEY_KEY = 'vllm_api_key'

        const CONFIGURATIONS_KEY = 'vllm_configurations'

        const PRIVACY_ACK_KEY = 'vllm_privacy_acknowledged'

        /* =========================
 STATE
 ========================= */

        let conversations = []

        let currentConversationId = null

        let conversationToDelete = null
        let savedConfigurations = []
        let configurationToDelete = null
        let currentModel = ''
        let currentModels = []
        let currentSystemPrompt = ''
        let currentModelEndpoint = ''
        let currentModelApiKey = ''

        let isSending = false

        /* =========================
 ELEMENTS
 ========================= */

        const conversationList = document.getElementById('conversationList')

        const chatInner = document.getElementById('chatInner')

        const chatArea = document.getElementById('chatArea')

        const promptInput = document.getElementById('promptInput')

        const sendBtn = document.getElementById('sendBtn')

        const newChatBtn = document.getElementById('newChatBtn')

        const settingsToggle = document.getElementById('settingsToggle')

        const mobileMenuBtn = document.getElementById('mobileMenuBtn')

        const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay')

        const settingsPanel = document.getElementById('settingsPanel')

        const endpointInput = document.getElementById('endpointInput')

        const apiKeyInput = document.getElementById('apiKeyInput')


        const settingsStatus = document.getElementById('settingsStatus')
        const systemPromptInput = document.getElementById('systemPromptInput')
        const savedConfigList = document.getElementById('savedConfigList')

        const privacyBtn = document.getElementById('privacyBtn')

        const deleteModal = document.getElementById('deleteModal')

        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn')

        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn')

        const privacyModal = document.getElementById('privacyModal')
        const deleteConfigModal = document.getElementById('deleteConfigModal')
        const deleteConfigMessage = document.getElementById('deleteConfigMessage')
        const cancelDeleteConfigBtn = document.getElementById('cancelDeleteConfigBtn')
        const confirmDeleteConfigBtn = document.getElementById('confirmDeleteConfigBtn')

        const privacyCheckbox = document.getElementById('privacyCheckbox')

        const privacyContinueBtn = document.getElementById('privacyContinueBtn')

        /* =========================
 MARKDOWN
 ========================= */

        marked.setOptions({
            gfm: true,
            breaks: true
        })

        function renderMarkdown(text) {
            if (!text) {
                return ''
            }

            const rawHtml = marked.parse(text)

            return DOMPurify.sanitize(rawHtml, {
                USE_PROFILES: {
                    html: true
                }
            })
        }

        /* =========================
 STORAGE
 ========================= */

        function saveConversations() {
            localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
        }

        function loadConversations() {
            const stored = localStorage.getItem(CONVERSATIONS_KEY)

            if (!stored) {
                conversations = []

                return
            }

            try {
                const parsed = JSON.parse(stored)

                if (Array.isArray(parsed)) {
                    conversations = parsed
                } else {
                    conversations = []
                }
            } catch (error) {
                console.error('Could not load conversations:', error)

                conversations = []
            }
        }

        function saveSettings() {
            localStorage.setItem(ENDPOINT_KEY, endpointInput.value.trim())

            localStorage.setItem(API_KEY_KEY, apiKeyInput.value.trim())
        }

        function loadSettings() {
            endpointInput.value = localStorage.getItem(ENDPOINT_KEY) || ''

            apiKeyInput.value = localStorage.getItem(API_KEY_KEY) || ''

            currentModel = ''
            currentModels = []
            currentSystemPrompt = ''
            currentModelEndpoint = ''
            currentModelApiKey = ''
        }

        /* =========================
 SAVED CONFIGURATIONS
 ========================= */

        function saveConfigurations() {
            localStorage.setItem(CONFIGURATIONS_KEY, JSON.stringify(savedConfigurations))
        }

        function loadConfigurations() {
            const stored = localStorage.getItem(CONFIGURATIONS_KEY)
            if (!stored) { savedConfigurations = []; return }
            try {
                const parsed = JSON.parse(stored)
                savedConfigurations = Array.isArray(parsed) ? parsed.filter((config) =>
                    config && typeof config.endpoint === 'string' && typeof config.apiKey === 'string' && typeof config.model === 'string'
                ).map((config) => ({
                    ...config,
                    systemPrompt: typeof config.systemPrompt === 'string' ? config.systemPrompt : '',
                    models: [...new Set([
                        ...(Array.isArray(config.models)
                            ? config.models.filter((model) => typeof model === 'string' && model)
                            : []),
                        config.model
                    ])]
                })) : []
            } catch (error) {
                console.error('Could not load saved configurations:', error)
                savedConfigurations = []
            }
        }

        function getCurrentConfigurationValues() {
            return {
                endpoint: endpointInput.value.trim(),
                apiKey: apiKeyInput.value.trim(),
                model: currentModel,
                systemPrompt: currentSystemPrompt
            }
        }

        function configurationsMatch(a, b) {
            return a.endpoint === b.endpoint && a.apiKey === b.apiKey && a.model === b.model
        }

        function getConfigurationDisplayName(config) {
            const model = config.model || 'Unnamed configuration'
            const duplicates = savedConfigurations.filter((item) => item.model === model)
            if (duplicates.length <= 1) return model
            const index = duplicates.findIndex((item) => item.id === config.id)
            return model + ' (Endpoint ' + (index + 1) + ')'
        }

        function getActiveConfigurationId() {
            const endpoint = endpointInput.value.trim()
            const apiKey = apiKeyInput.value.trim()

            const match = savedConfigurations.find((config) =>
                config.endpoint === endpoint &&
                config.apiKey === apiKey &&
                config.model === currentModel
            )

            return match ? match.id : null
        }

        function getRememberedConfiguration(endpoint, apiKey) {
            return savedConfigurations.find((config) =>
                config.endpoint === endpoint && config.apiKey === apiKey
            )
        }

        function renderSavedConfigurations() {
            savedConfigList.innerHTML = ''
            if (savedConfigurations.length === 0) {
                const empty = document.createElement('div')
                empty.className = 'no-saved-configs'
                empty.textContent = 'Configurations are saved after a chat is sent.'
                savedConfigList.appendChild(empty)
                return
            }
            const activeId = getActiveConfigurationId()
            savedConfigurations.forEach((config) => {
                const item = document.createElement('div')
                item.className = 'saved-config' + (config.id === activeId ? ' active' : '')
                item.title = config.endpoint
                item.dataset.configurationId = config.id

                if (config.models && config.models.length > 1) {
                    const modelSelect = document.createElement('select')
                    modelSelect.className = 'saved-config-model'
                    modelSelect.setAttribute('aria-label', 'Select model for ' + config.endpoint)
                    config.models.forEach((model) => {
                        const option = document.createElement('option')
                        option.value = model
                        option.textContent = model
                        option.selected = model === config.model
                        modelSelect.appendChild(option)
                    })
                    modelSelect.addEventListener('click', (event) => {
                        event.stopPropagation()
                        selectConfigurationModel(config.id, modelSelect.value, false)
                    })
                    modelSelect.addEventListener('change', () => selectConfigurationModel(config.id, modelSelect.value))
                    item.appendChild(modelSelect)
                } else {
                    const name = document.createElement('span')
                    name.className = 'saved-config-name'
                    name.textContent = getConfigurationDisplayName(config)
                    item.appendChild(name)
                }

                const deleteButton = document.createElement('button')
                deleteButton.className = 'delete-config-btn'
                deleteButton.type = 'button'
                deleteButton.textContent = '×'
                deleteButton.title = 'Delete saved configuration'
                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation()
                    openDeleteConfigurationModal(config.id)
                })

                item.addEventListener('click', () => loadSavedConfiguration(config.id))
                item.appendChild(deleteButton)
                savedConfigList.appendChild(item)
            })
        }

        function selectConfigurationModel(id, model, rerender = true) {
            const config = savedConfigurations.find((item) => item.id === id)
            if (!config || !config.models.includes(model)) return

            config.model = model
            endpointInput.value = config.endpoint
            apiKeyInput.value = config.apiKey
            currentModel = model
            currentModels = config.models
            currentSystemPrompt = config.systemPrompt || ''
            systemPromptInput.value = currentSystemPrompt
            currentModelEndpoint = config.endpoint
            currentModelApiKey = config.apiKey
            localStorage.setItem(ENDPOINT_KEY, config.endpoint)
            localStorage.setItem(API_KEY_KEY, config.apiKey)
            saveConfigurations()
            settingsStatus.textContent = 'Selected model: ' + model
            if (rerender) {
                renderSavedConfigurations()
            } else {
                savedConfigList.querySelectorAll('.saved-config').forEach((item) => {
                    item.classList.toggle('active', item.dataset.configurationId === id)
                })
            }
        }

        function loadSavedConfiguration(id) {
            const config = savedConfigurations.find((item) => item.id === id)
            if (!config) return
            endpointInput.value = config.endpoint
            apiKeyInput.value = config.apiKey
            currentModel = config.model
            currentModels = config.models || [config.model]
            currentSystemPrompt = config.systemPrompt || ''
            systemPromptInput.value = currentSystemPrompt
            currentModelEndpoint = config.endpoint
            currentModelApiKey = config.apiKey
            localStorage.setItem(ENDPOINT_KEY, config.endpoint)
            localStorage.setItem(API_KEY_KEY, config.apiKey)
            settingsStatus.textContent = 'Loaded: ' + getConfigurationDisplayName(config)
            renderSavedConfigurations()
        }

        function saveCurrentConfiguration() {
            const current = getCurrentConfigurationValues()
            if (!current.endpoint || !current.apiKey || !current.model) return
            const existing = savedConfigurations.find((config) => configurationsMatch(config, current))
            if (existing) {
                existing.models = [...new Set([...(existing.models || []), ...currentModels, current.model])]
                existing.systemPrompt = current.systemPrompt
                saveConfigurations()
                renderSavedConfigurations()
                return
            }
            savedConfigurations.push({
                id: Date.now().toString() + Math.random().toString(36).slice(2),
                endpoint: current.endpoint,
                apiKey: current.apiKey,
                model: current.model,
                systemPrompt: current.systemPrompt,
                models: [...new Set([...currentModels, current.model])]
            })
            saveConfigurations()
            renderSavedConfigurations()
        }

        function openDeleteConfigurationModal(id) {
            configurationToDelete = id
            const config = savedConfigurations.find((item) => item.id === id)
            if (!config) return
            deleteConfigMessage.textContent = 'Delete the saved configuration "' + getConfigurationDisplayName(config) + '"?'
            deleteConfigModal.classList.add('visible')
            cancelDeleteConfigBtn.focus()
        }

        function closeDeleteConfigurationModal() {
            configurationToDelete = null
            deleteConfigModal.classList.remove('visible')
        }

        function confirmDeleteConfiguration() {
            if (!configurationToDelete) return
            savedConfigurations = savedConfigurations.filter((config) => config.id !== configurationToDelete)
            saveConfigurations()
            closeDeleteConfigurationModal()
            renderSavedConfigurations()
        }

        /* =========================
 PRIVACY
 ========================= */

        function hasAcknowledgedPrivacy() {
            return localStorage.getItem(PRIVACY_ACK_KEY) === 'true'
        }

        function openPrivacyModal(requireAcknowledgement = false) {
            privacyCheckbox.checked = false

            privacyContinueBtn.disabled = true

            privacyModal.classList.add('visible')

            privacyModal.dataset.required = requireAcknowledgement ? 'true' : 'false'

            setTimeout(() => {
                privacyCheckbox.focus()
            }, 50)
        }

        function closePrivacyModal() {
            if (privacyModal.dataset.required === 'true' && !hasAcknowledgedPrivacy()) {
                return
            }

            privacyModal.classList.remove('visible')
        }

        function acknowledgePrivacy() {
            if (!privacyCheckbox.checked) {
                return
            }

            localStorage.setItem(PRIVACY_ACK_KEY, 'true')

            privacyModal.classList.remove('visible')

            promptInput.focus()
        }

        privacyCheckbox.addEventListener('change', () => {
            privacyContinueBtn.disabled = !privacyCheckbox.checked
        })

        privacyContinueBtn.addEventListener('click', acknowledgePrivacy)

        privacyBtn.addEventListener('click', () => {
            openPrivacyModal(false)
        })

        /* =========================
 MOBILE SIDEBAR DRAWER
 ========================= */

        function isMobileLayout() {
            return window.matchMedia('(max-width: 700px)').matches
        }

        function openMobileSidebar() {
            if (!isMobileLayout()) {
                return
            }

            document.querySelector('.sidebar').classList.add('mobile-open')
            mobileSidebarOverlay.classList.add('visible')
            mobileMenuBtn.setAttribute('aria-expanded', 'true')
        }

        function closeMobileSidebar() {
            document.querySelector('.sidebar').classList.remove('mobile-open')
            mobileSidebarOverlay.classList.remove('visible')
            mobileMenuBtn.setAttribute('aria-expanded', 'false')
        }

        function toggleMobileSidebar() {
            const sidebar = document.querySelector('.sidebar')

            if (sidebar.classList.contains('mobile-open')) {
                closeMobileSidebar()
            } else {
                openMobileSidebar()
            }
        }

        /* =========================
 CONVERSATIONS
 ========================= */

        function createConversation() {
            closeMobileSidebar()

            const conversation = {
                id: Date.now().toString() + Math.random().toString(36).slice(2),

                title: 'New Chat',

                created: new Date().toISOString(),

                messages: []
            }

            conversations.unshift(conversation)

            currentConversationId = conversation.id

            saveConversations()

            renderSidebar()

            renderCurrentConversation()

            promptInput.focus()
        }

        function getCurrentConversation() {
            return conversations.find((conversation) => conversation.id === currentConversationId)
        }

        function renderSidebar() {
            conversationList.innerHTML = ''

            conversations.forEach((conversation) => {
                const item = document.createElement('div')

                item.className = 'conversation-item' + (conversation.id === currentConversationId ? ' active' : '')

                item.title = conversation.title

                const titleSpan = document.createElement('span')

                titleSpan.textContent = conversation.title

                const deleteButton = document.createElement('button')

                deleteButton.className = 'delete-conversation-btn'

                deleteButton.textContent = '×'

                deleteButton.title = 'Delete conversation'

                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation()

                    openDeleteModal(conversation.id)
                })

                item.addEventListener('click', () => {
                    currentConversationId = conversation.id

                    closeMobileSidebar()

                    renderSidebar()

                    renderCurrentConversation()

                    promptInput.focus()
                })

                item.appendChild(titleSpan)

                item.appendChild(deleteButton)

                conversationList.appendChild(item)
            })
        }

        /* =========================
 DELETE
 ========================= */

        function openDeleteModal(id) {
            conversationToDelete = id

            deleteModal.classList.add('visible')

            cancelDeleteBtn.focus()
        }

        function closeDeleteModal() {
            conversationToDelete = null

            deleteModal.classList.remove('visible')
        }

        function confirmDelete() {
            if (!conversationToDelete) {
                return
            }

            const id = conversationToDelete

            conversations = conversations.filter((conversation) => conversation.id !== id)

            saveConversations()

            if (currentConversationId === id) {
                if (conversations.length > 0) {
                    currentConversationId = conversations[0].id
                } else {
                    currentConversationId = null
                }
            }

            closeDeleteModal()

            renderSidebar()

            renderCurrentConversation()

            promptInput.focus()
        }

        cancelDeleteBtn.addEventListener('click', closeDeleteModal)

        confirmDeleteBtn.addEventListener('click', confirmDelete)

        cancelDeleteConfigBtn.addEventListener('click', closeDeleteConfigurationModal)
        confirmDeleteConfigBtn.addEventListener('click', confirmDeleteConfiguration)

        /* =========================
 CHAT RENDERING
 ========================= */

        function renderCurrentConversation() {
            chatInner.innerHTML = ''

            const conversation = getCurrentConversation()

            if (!conversation || conversation.messages.length === 0) {
                const welcome = document.createElement('div')

                welcome.className = 'welcome'

                welcome.innerHTML = `
                <div class="welcome-title">
                  SBCODE vLLM Client
                </div>

                <div class="welcome-subtitle">
                  Enter your endpoint and API key in Settings,
                  then start chatting.
                </div>
              `

                chatInner.appendChild(welcome)

                return
            }

            let latestUserMessageIndex = -1
            conversation.messages.forEach((message, index) => {
                if (message.role === 'user') {
                    latestUserMessageIndex = index
                }
            })

            conversation.messages.forEach((message, index) => {
                const contentElement = appendMessageToDOM(message.role, message.content, null, message.model)
                const messageElement = contentElement.parentElement
                messageElement.dataset.messageIndex = index
                if (message.role === 'user' && index === latestUserMessageIndex) {
                    appendUserMessageActions(messageElement, index)
                }
            })

            scrollChatToBottom()
        }

        function appendMessageToDOM(role, content, retryMessageIndex = null, model = '') {
            const message = document.createElement('div')

            message.className = 'message ' + (role === 'user' ? 'user' : 'assistant')

            const roleElement = document.createElement('div')

            roleElement.className = 'message-role'

            roleElement.textContent = role === 'user' ? 'YOU' : 'ASSISTANT'
            if (role === 'assistant' && model) {
                const modelElement = document.createElement('span')
                modelElement.className = 'message-model'
                modelElement.textContent = model
                roleElement.appendChild(modelElement)
            }

            const contentElement = document.createElement('div')

            contentElement.className = 'message-content'

            if (role === 'assistant') {
                contentElement.innerHTML = renderMarkdown(content)
            } else {
                contentElement.textContent = content
            }

            message.appendChild(roleElement)

            message.appendChild(contentElement)

            if (role === 'user' && retryMessageIndex !== null) {
                message.dataset.messageIndex = retryMessageIndex
                appendUserMessageActions(message, retryMessageIndex)
            }

            chatInner.appendChild(message)

            return contentElement
        }

        function setAssistantMessageModel(contentElement, model) {
            if (!model) return

            const roleElement = contentElement.parentElement.querySelector('.message-role')
            let modelElement = roleElement.querySelector('.message-model')
            if (!modelElement) {
                modelElement = document.createElement('span')
                modelElement.className = 'message-model'
                roleElement.appendChild(modelElement)
            }
            modelElement.textContent = model
        }

        function appendUserMessageActions(messageElement, messageIndex) {
            const actions = document.createElement('div')
            actions.className = 'user-message-actions'

            const retryButton = document.createElement('button')
            retryButton.className = 'retry-message-button'
            retryButton.type = 'button'
            retryButton.textContent = '↻'
            retryButton.title = 'Regenerate the response to this message'
            retryButton.setAttribute('aria-label', 'Regenerate the response to this message')
            retryButton.disabled = isSending
            retryButton.addEventListener('click', () => sendMessage(Number(messageElement.dataset.messageIndex)))
            actions.appendChild(retryButton)

            const deleteButton = document.createElement('button')
            deleteButton.className = 'delete-message-button'
            deleteButton.type = 'button'
            deleteButton.title = 'Delete this message from conversation history'
            deleteButton.setAttribute('aria-label', 'Delete this message from conversation history')
            deleteButton.disabled = isSending
            deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg>'
            deleteButton.addEventListener('click', () => deleteUserMessage(Number(messageElement.dataset.messageIndex)))
            actions.appendChild(deleteButton)

            messageElement.appendChild(actions)
        }

        function deleteUserMessage(messageIndex) {
            const conversation = getCurrentConversation()
            const message = conversation && conversation.messages[messageIndex]
            if (!message || message.role !== 'user' || isSending) return

            conversation.messages.splice(messageIndex, 1)
            const messageElement = [...chatInner.querySelectorAll('.message')].find(
                (element) => Number(element.dataset.messageIndex) === messageIndex
            )
            if (messageElement) {
                messageElement.remove()
            }

            chatInner.querySelectorAll('.message').forEach((element) => {
                const index = Number(element.dataset.messageIndex)
                if (index > messageIndex) {
                    element.dataset.messageIndex = index - 1
                }
            })

            chatInner.querySelectorAll('.user-message-actions').forEach((actions) => actions.remove())
            const latestUserMessageIndex = conversation.messages.reduce(
                (latestIndex, item, index) => item.role === 'user' ? index : latestIndex,
                -1
            )
            if (latestUserMessageIndex !== -1) {
                const latestUserElement = [...chatInner.querySelectorAll('.message.user')].find(
                    (element) => Number(element.dataset.messageIndex) === latestUserMessageIndex
                )
                if (latestUserElement) {
                    appendUserMessageActions(latestUserElement, latestUserMessageIndex)
                }
            }

            saveConversations()
            renderSidebar()
        }

        /* =========================
 THINKING INDICATOR
 ========================= */

        function createThinkingIndicator() {
            const indicator = document.createElement('div')

            indicator.className = 'thinking-indicator'

            indicator.setAttribute('aria-label', 'Waiting for response')

            indicator.innerHTML = `
              <span>.</span>
              <span>.</span>
              <span>.</span>
            `

            return indicator
        }

        function showThinkingIndicator(contentElement) {
            contentElement.innerHTML = ''

            contentElement.appendChild(createThinkingIndicator())
        }

        function removeThinkingIndicator(contentElement) {
            const indicator = contentElement.querySelector('.thinking-indicator')

            if (indicator) {
                indicator.remove()
            }
        }

        function scrollChatToBottom() {
            requestAnimationFrame(() => {
                chatArea.scrollTop = chatArea.scrollHeight
            })
        }

        /* =========================
 NEW CHAT
 ========================= */

        newChatBtn.addEventListener('click', createConversation)

        mobileMenuBtn.addEventListener('click', toggleMobileSidebar)
        mobileSidebarOverlay.addEventListener('click', closeMobileSidebar)

        window.addEventListener('resize', () => {
            if (!isMobileLayout()) {
                closeMobileSidebar()
            }
        })

        /* =========================
 SETTINGS
 ========================= */

        settingsToggle.addEventListener('click', () => {
            settingsPanel.classList.toggle('visible')
            renderSavedConfigurations()
        })

        function handleConnectionSettingChange() {
            const endpoint = endpointInput.value.trim().replace(/\/+$/, '')
            const apiKey = apiKeyInput.value.trim()

            if (endpoint !== currentModelEndpoint || apiKey !== currentModelApiKey) {
                const remembered = getRememberedConfiguration(endpoint, apiKey)
                if (remembered) {
                    currentModel = remembered.model
                    currentModels = remembered.models || [remembered.model]
                    currentSystemPrompt = remembered.systemPrompt || ''
                    currentModelEndpoint = endpoint
                    currentModelApiKey = apiKey
                    settingsStatus.textContent = 'Saved model: ' + remembered.model
                } else {
                    currentModel = ''
                    currentModels = []
                    currentSystemPrompt = ''
                    currentModelEndpoint = ''
                    currentModelApiKey = ''
                    settingsStatus.textContent = 'Model is detected automatically when you start a chat.'
                }
                systemPromptInput.value = currentSystemPrompt
            }

            renderSavedConfigurations()
        }

        endpointInput.addEventListener('input', handleConnectionSettingChange)
        apiKeyInput.addEventListener('input', handleConnectionSettingChange)
        systemPromptInput.addEventListener('input', () => {
            currentSystemPrompt = systemPromptInput.value
            saveCurrentConfiguration()
        })

        /* =========================
 MODEL DISCOVERY
 ========================= */

        function getModelsEndpoint(endpoint) {
            const normalizedEndpoint = endpoint.replace(/\/+$/, '')

            if (!normalizedEndpoint.endsWith('/v1/chat/completions')) {
                return null
            }

            return normalizedEndpoint.replace('/v1/chat/completions', '/v1/models')
        }

        async function discoverModel(endpoint, apiKey) {
            const modelsEndpoint = getModelsEndpoint(endpoint)

            if (!modelsEndpoint) {
                throw new Error('Endpoint must end with /v1/chat/completions')
            }

            settingsStatus.textContent = 'Detecting model...'

            const response = await fetch(modelsEndpoint, {
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + apiKey
                }
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error('HTTP ' + response.status + (errorText ? ': ' + errorText : ''))
            }

            const data = await response.json()

            if (!Array.isArray(data.data) || data.data.length === 0) {
                throw new Error('No models were returned.')
            }

            const models = [...new Set(data.data
                .map((item) => item && typeof item.id === 'string' ? item.id : '')
                .filter(Boolean))]
            if (models.length === 0) {
                throw new Error('No models were returned.')
            }

            const detectedModel = models[0]

            currentModel = detectedModel
            currentModels = models
            currentModelEndpoint = endpoint
            currentModelApiKey = apiKey


            saveCurrentConfiguration()

            settingsStatus.textContent = 'Model detected: ' + detectedModel

            return detectedModel
        }

        /* =========================
 SEND MESSAGE
 ========================= */

        async function sendMessage(retryMessageIndex = null) {
            if (isSending) {
                return
            }

            let endpoint = endpointInput.value.trim().replace(/\/+$/, '')
            const apiKey = apiKeyInput.value.trim()
            let prompt = promptInput.value.trim()

            if (!endpoint) {
                settingsPanel.classList.add('visible')
                settingsStatus.textContent = 'Enter your vLLM endpoint.'
                return
            }

            if (!apiKey) {
                settingsPanel.classList.add('visible')
                settingsStatus.textContent = 'Enter your API key.'
                return
            }

            if (!getModelsEndpoint(endpoint)) {
                settingsPanel.classList.add('visible')
                settingsStatus.textContent = 'Endpoint must end with /v1/chat/completions'
                return
            }

            if (retryMessageIndex === null && !prompt) {
                return
            }

            endpointInput.value = endpoint
            saveSettings()

            /* Create a conversation automatically for a new message. */

            if (retryMessageIndex === null && !currentConversationId) {
                const conversation = {
                    id: Date.now().toString() + Math.random().toString(36).slice(2),
                    title: 'New Chat',
                    created: new Date().toISOString(),
                    messages: []
                }

                conversations.unshift(conversation)
                currentConversationId = conversation.id
            }

            const conversation = getCurrentConversation()

            if (!conversation) {
                return
            }

            if (retryMessageIndex !== null) {
                const userMessage = conversation.messages[retryMessageIndex]
                if (!userMessage || userMessage.role !== 'user') {
                    return
                }
                const latestUserMessageIndex = conversation.messages.reduce(
                    (latestIndex, message, index) => message.role === 'user' ? index : latestIndex,
                    -1
                )
                if (retryMessageIndex !== latestUserMessageIndex) {
                    return
                }
                prompt = userMessage.content
                conversation.messages.splice(retryMessageIndex + 1)
            } else {
                /* First prompt becomes title. */

                if (conversation.messages.length === 0) {
                    conversation.title = prompt.length > 45 ? prompt.slice(0, 45) + '...' : prompt
                }

                conversation.messages.push({
                    role: 'user',
                    content: prompt
                })
                promptInput.value = ''
            }

            saveConversations()
            renderSidebar()

            isSending = true
            sendBtn.disabled = true
            promptInput.disabled = true

            if (retryMessageIndex !== null) {
                renderCurrentConversation()
            } else {
                chatInner.querySelectorAll('.user-message-actions').forEach((actions) => actions.remove())
                appendMessageToDOM('user', prompt, conversation.messages.length - 1)
            }

            const assistantContent = appendMessageToDOM('assistant', '')
            showThinkingIndicator(assistantContent)
            scrollChatToBottom()

            let assistantText = ''
            let reasoningText = ''
            let reasoningContent = null
            let hasReceivedContent = false
            const rememberedConfiguration = getRememberedConfiguration(endpoint, apiKey)
            let model = rememberedConfiguration ? rememberedConfiguration.model : ''

            try {
                /*
                 * If this exact endpoint + API key has no remembered model,
                 * discover it now. This may also trigger a RunPod cold start.
                 */

                if (model) {
                    currentModel = model
                    currentModels = rememberedConfiguration.models || [model]
                    currentSystemPrompt = rememberedConfiguration.systemPrompt || ''
                    systemPromptInput.value = currentSystemPrompt
                    currentModelEndpoint = endpoint
                    currentModelApiKey = apiKey
                    settingsStatus.textContent = 'Using saved model: ' + model
                } else if (currentModel && currentModelEndpoint === endpoint && currentModelApiKey === apiKey) {
                    model = currentModel
                    settingsStatus.textContent = 'Using model: ' + model
                } else {
                    model = await discoverModel(endpoint, apiKey)
                }

                setAssistantMessageModel(assistantContent, model)

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + apiKey
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: currentSystemPrompt
                            ? [{ role: 'system', content: currentSystemPrompt }, ...conversation.messages]
                            : conversation.messages,
                        temperature: 1,
                        max_tokens: 5000,
                        stream: true
                    })
                })

                // console.log("status", response.status)
                // console.log("content-type", response.headers.get("content-type"))

                if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error('HTTP ' + response.status + (errorText ? ': ' + errorText : ''))
                }

                if (!response.body) {
                    throw new Error('Streaming is not supported by this response.')
                }

                const reader = response.body.getReader()
                const decoder = new TextDecoder('utf-8')
                let buffer = ''

                while (true) {
                    const { value, done } = await reader.read()
                    // console.log("read done=", done, "bytes=", value?.byteLength)

                    if (done) {
                        break
                    }

                    buffer += decoder.decode(value, {
                        stream: true
                    })

                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (let line of lines) {
                        line = line.trim()

                        if (!line || !line.startsWith('data:')) {
                            continue
                        }

                        const data = line.slice(5).trim()

                        if (data === '[DONE]') {
                            continue
                        }

                        try {
                            const json = JSON.parse(data)

                            // chat.completions streaming style
                            const delta = json?.choices?.[0]?.delta
                            const reasoningChunk = typeof delta?.reasoning_content === 'string'
                                ? delta.reasoning_content
                                : (typeof delta?.reasoning === 'string' ? delta.reasoning : '')

                            if (reasoningChunk) {
                                reasoningText += reasoningChunk
                                if (!reasoningContent) {
                                    const reasoningPanel = document.createElement('details')
                                    reasoningPanel.className = 'message-reasoning'
                                    reasoningPanel.open = true

                                    const reasoningTitle = document.createElement('summary')
                                    reasoningTitle.textContent = 'Thinking / reasoning (not the final answer)'

                                    reasoningContent = document.createElement('div')
                                    reasoningContent.className = 'message-reasoning-content'

                                    reasoningPanel.appendChild(reasoningTitle)
                                    reasoningPanel.appendChild(reasoningContent)
                                    assistantContent.parentElement.insertBefore(reasoningPanel, assistantContent)
                                }

                                if (!hasReceivedContent) {
                                    hasReceivedContent = true
                                    removeThinkingIndicator(assistantContent)
                                }

                                reasoningContent.textContent = reasoningText
                                reasoningContent.scrollTop = reasoningContent.scrollHeight
                                scrollChatToBottom()
                            }

                            // some providers stream "text" instead
                            const text = json?.choices?.[0]?.text

                            const content = delta?.content
                            const chunk = (typeof content === 'string' ? content : (typeof text === 'string' ? text : null))

                            if (chunk) {
                                assistantText += chunk
                                if (!hasReceivedContent) {
                                    hasReceivedContent = true
                                    removeThinkingIndicator(assistantContent)
                                }
                                assistantContent.innerHTML = renderMarkdown(assistantText)
                                scrollChatToBottom()
                            }
                        } catch (parseError) {
                            console.warn('Could not parse stream chunk:', parseError)
                        }
                    }
                }

                /* Save completed assistant response in its original Markdown form. */

                conversation.messages.push({
                    role: 'assistant',
                    content: assistantText,
                    model: model
                })

                saveConversations()
                saveCurrentConfiguration()
            } catch (error) {
                console.error('Chat error:', error)

                const errorMessage = 'Error: ' + error.message
                assistantText = errorMessage

                removeThinkingIndicator(assistantContent)
                assistantContent.innerHTML = renderMarkdown(errorMessage)

                conversation.messages.push({
                    role: 'assistant',
                    content: errorMessage,
                    ...(model ? { model: model } : {})
                })

                saveConversations()
            } finally {
                isSending = false
                sendBtn.disabled = false
                promptInput.disabled = false
                chatInner.querySelectorAll('.retry-message-button, .delete-message-button').forEach((button) => {
                    button.disabled = false
                })
                promptInput.focus()
                renderSavedConfigurations()
                scrollChatToBottom()
            }
        }

        sendBtn.addEventListener('click', () => sendMessage())

        /* =========================
 KEYBOARD SHORTCUT
 ========================= */

        promptInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()

                sendMessage()
            }
        })

        /* =========================
 MODAL KEYBOARD HANDLING
 ========================= */

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') {
                return
            }

            const sidebar = document.querySelector('.sidebar')
            if (sidebar.classList.contains('mobile-open')) {
                closeMobileSidebar()
                return
            }

            if (deleteConfigModal.classList.contains('visible')) {
                closeDeleteConfigurationModal()
                return
            }

            if (deleteModal.classList.contains('visible')) {
                closeDeleteModal()

                return
            }

            if (privacyModal.classList.contains('visible')) {
                /*
        First-use privacy popup cannot
        be dismissed until acknowledged.
        */

                if (privacyModal.dataset.required === 'true' && !hasAcknowledgedPrivacy()) {
                    return
                }

                closePrivacyModal()
            }
        })

        /* =========================
 INITIALIZE
 ========================= */

        loadConversations()

        loadSettings()
        loadConfigurations()

        renderSavedConfigurations()
        renderSidebar()

        renderCurrentConversation()

        if (!hasAcknowledgedPrivacy()) {
            openPrivacyModal(true)
        } else {
            promptInput.focus()
        }
