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
                ) : []
            } catch (error) {
                console.error('Could not load saved configurations:', error)
                savedConfigurations = []
            }
        }

        function getCurrentConfigurationValues() {
            return {
                endpoint: endpointInput.value.trim(),
                apiKey: apiKeyInput.value.trim(),
                model: currentModel
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

                const name = document.createElement('span')
                name.className = 'saved-config-name'
                name.textContent = getConfigurationDisplayName(config)

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
                item.appendChild(name)
                item.appendChild(deleteButton)
                savedConfigList.appendChild(item)
            })
        }

        function loadSavedConfiguration(id) {
            const config = savedConfigurations.find((item) => item.id === id)
            if (!config) return
            endpointInput.value = config.endpoint
            apiKeyInput.value = config.apiKey
            currentModel = config.model
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
            if (existing) return
            savedConfigurations.push({
                id: Date.now().toString() + Math.random().toString(36).slice(2),
                endpoint: current.endpoint,
                apiKey: current.apiKey,
                model: current.model
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

            conversation.messages.forEach((message) => {
                appendMessageToDOM(message.role, message.content)
            })

            scrollChatToBottom()
        }

        function appendMessageToDOM(role, content) {
            const message = document.createElement('div')

            message.className = 'message ' + (role === 'user' ? 'user' : 'assistant')

            const roleElement = document.createElement('div')

            roleElement.className = 'message-role'

            roleElement.textContent = role === 'user' ? 'YOU' : 'ASSISTANT'

            const contentElement = document.createElement('div')

            contentElement.className = 'message-content'

            if (role === 'assistant') {
                contentElement.innerHTML = renderMarkdown(content)
            } else {
                contentElement.textContent = content
            }

            message.appendChild(roleElement)

            message.appendChild(contentElement)

            chatInner.appendChild(message)

            return contentElement
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
                const remembered = getRememberedModel(endpoint, apiKey)
                if (remembered) {
                    currentModel = remembered
                    currentModelEndpoint = endpoint
                    currentModelApiKey = apiKey
                    settingsStatus.textContent = 'Saved model: ' + remembered
                } else {
                    currentModel = ''
                    currentModelEndpoint = ''
                    currentModelApiKey = ''
                    settingsStatus.textContent = 'Model is detected automatically when you start a chat.'
                }
            }

            renderSavedConfigurations()
        }

        endpointInput.addEventListener('input', handleConnectionSettingChange)
        apiKeyInput.addEventListener('input', handleConnectionSettingChange)

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

        function getRememberedModel(endpoint, apiKey) {
            const config = savedConfigurations.find((item) =>
                item.endpoint === endpoint && item.apiKey === apiKey
            )

            return config ? config.model : ''
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

            if (!data.data || !Array.isArray(data.data) || data.data.length === 0 || !data.data[0]?.id) {
                throw new Error('No models were returned.')
            }

            const detectedModel = data.data[0].id

            currentModel = detectedModel
            currentModelEndpoint = endpoint
            currentModelApiKey = apiKey


            saveCurrentConfiguration()

            settingsStatus.textContent = 'Model detected: ' + detectedModel

            return detectedModel
        }

        /* =========================
 SEND MESSAGE
 ========================= */

        async function sendMessage() {
            if (isSending) {
                return
            }

            let endpoint = endpointInput.value.trim().replace(/\/+$/, '')
            const apiKey = apiKeyInput.value.trim()
            const prompt = promptInput.value.trim()

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

            if (!prompt) {
                return
            }

            endpointInput.value = endpoint
            saveSettings()

            /* Create a conversation automatically if none currently exists. */

            if (!currentConversationId) {
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

            /* First prompt becomes title. */

            if (conversation.messages.length === 0) {
                conversation.title = prompt.length > 45 ? prompt.slice(0, 45) + '...' : prompt
            }

            conversation.messages.push({
                role: 'user',
                content: prompt
            })

            saveConversations()
            renderSidebar()

            /* Clear input. */

            promptInput.value = ''

            /* Render user message and waiting indicator immediately. */

            appendMessageToDOM('user', prompt)

            const assistantContent = appendMessageToDOM('assistant', '')
            showThinkingIndicator(assistantContent)
            scrollChatToBottom()

            isSending = true
            sendBtn.disabled = true
            promptInput.disabled = true

            let assistantText = ''
            let hasReceivedContent = false
            let model = getRememberedModel(endpoint, apiKey)

            try {
                /*
                 * If this exact endpoint + API key has no remembered model,
                 * discover it now. This may also trigger a RunPod cold start.
                 */

                if (model) {
                    currentModel = model
                    currentModelEndpoint = endpoint
                    currentModelApiKey = apiKey
                    settingsStatus.textContent = 'Using saved model: ' + model
                } else if (currentModel && currentModelEndpoint === endpoint && currentModelApiKey === apiKey) {
                    model = currentModel
                    settingsStatus.textContent = 'Using model: ' + model
                } else {
                    model = await discoverModel(endpoint, apiKey)
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + apiKey
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: conversation.messages,
                        temperature: 0.7,
                        max_tokens: 5000,
                        stream: true
                    })
                })

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
                            const delta = json?.choices?.[0]?.delta?.content

                            if (typeof delta === 'string') {
                                assistantText += delta

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
                    content: assistantText
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
                    content: errorMessage
                })

                saveConversations()
            } finally {
                isSending = false
                sendBtn.disabled = false
                promptInput.disabled = false
                promptInput.focus()
                renderSavedConfigurations()
                scrollChatToBottom()
            }
        }

        sendBtn.addEventListener('click', sendMessage)

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
