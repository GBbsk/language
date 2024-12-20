// Inicialização do Firebase
firebase.initializeApp({
    apiKey: "AIzaSyBTCPe7wbzbCMw__M3vDWA5_lAJsglhTVw",
    authDomain: "nengues-bilingues.firebaseapp.com",
    projectId: "nengues-bilingues",
    storageBucket: "nengues-bilingues.firebasestorage.app",
    messagingSenderId: "399138749201",
    appId: "1:399138749201:web:038f2b38b121037828eab0l"
});

const db = firebase.firestore();

// Carregar módulos do Firebase
async function carregarModulos() {
    try {
        const modulosRef = await db.collection('modulos').orderBy('ordem').get();
        const modulosList = document.getElementById('lista-modulos');
        modulosList.innerHTML = '';
        
        modulosRef.forEach((doc) => {
            const modulo = doc.data();
            const moduloElement = document.createElement('li');
            moduloElement.className = 'modulo';
            moduloElement.setAttribute('data-modulo-id', doc.id);
            
            const submodulosHtml = modulo.submodulos ? modulo.submodulos
                .sort((a, b) => a.ordem - b.ordem)
                .map(sub => `
                    <li class="submodulo" 
                        onclick="event.stopPropagation(); selecionarSubmodulo('${doc.id}', '${sub.id}')">
                        ${sub.titulo}
                    </li>
                `).join('') : '';

            moduloElement.innerHTML = `
                <div class="modulo-header" onclick="toggleSubmodulos(this)">
                    <h3>${modulo.titulo}</h3>
                    <span class="seta">▼</span>
                </div>
                <ul class="lista-submodulos" style="display: none;">
                    ${submodulosHtml}
                </ul>
            `;
            modulosList.appendChild(moduloElement);
        });
    } catch (error) {
        console.error('Erro ao carregar módulos:', error);
        alert('Erro ao carregar módulos. Por favor, tente novamente.');
    }
}

// Função para alternar visibilidade dos submódulos
window.toggleSubmodulos = function(header) {
    const submodulosList = header.nextElementSibling;
    const seta = header.querySelector('.seta');
    const isVisible = submodulosList.style.display === 'block';
    
    // Fechar todos os outros submódulos
    document.querySelectorAll('.lista-submodulos').forEach(lista => {
        if (lista !== submodulosList) {
            lista.style.display = 'none';
            lista.previousElementSibling.querySelector('.seta').style.transform = 'rotate(0deg)';
        }
    });
    
    submodulosList.style.display = isVisible ? 'none' : 'block';
    seta.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
}

// Função para selecionar submódulo
window.selecionarSubmodulo = async function(moduloId, submoduloId) {
    try {
        console.log('Selecionando submódulo:', moduloId, submoduloId);
        
        // Buscar aulas do submódulo específico
        const aulasRef = await db.collection('aulas')
            .where('moduloId', '==', moduloId)
            .where('submoduloId', '==', submoduloId)
            .get();
        
        const aulas = [];
        aulasRef.forEach((doc) => {
            const aulaData = doc.data();
            console.log('Aula encontrada:', aulaData);
            aulas.push({ 
                id: doc.id, 
                ...aulaData 
            });
        });

        // Ordenar as aulas após recebê-las
        aulas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

        console.log('Total de aulas encontradas:', aulas.length);

        if (aulas.length > 0) {
            // Esconder conteúdo inicial
            document.getElementById('conteudo-inicial').style.display = 'none';
            
            // Mostrar conteúdo da aula
            const conteudoAula = document.getElementById('conteudo-aula');
            conteudoAula.style.display = 'block';
            
            // Carregar a primeira aula
            carregarAula(aulas[0], aulas);
            
            // Marcar o submódulo como ativo
            document.querySelectorAll('.submodulo').forEach(sub => {
                sub.classList.remove('active');
            });
            const submodulo = document.querySelector(`[onclick*="selecionarSubmodulo('${moduloId}', '${submoduloId}')"]`);
            if (submodulo) {
                submodulo.classList.add('active');
            }
        } else {
            console.log('Nenhuma aula encontrada para:', { moduloId, submoduloId });
            alert('Nenhuma aula encontrada para este submódulo');
        }
    } catch (error) {
        console.error('Erro ao carregar aulas:', error);
        alert('Erro ao carregar aulas. Por favor, tente novamente.');
    }
}

// Função para carregar aula
function carregarAula(aula, todasAulas) {
    console.log('Carregando aula:', aula);
    
    const conteudoAula = document.getElementById('conteudo-aula');
    const videoContainer = conteudoAula.querySelector('.video-container');
    
    // Atualizar título
    conteudoAula.querySelector('.aula-titulo').textContent = aula.titulo;
    
    // Carregar vídeo do YouTube
    const videoId = getYouTubeVideoId(aula.youtubeUrl);
    
    if (videoId) {
        videoContainer.innerHTML = `
            <iframe 
                id="video-aula"
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
        videoContainer.style.display = 'block';
    } else {
        console.error('ID do vídeo não encontrado:', aula.youtubeUrl);
        videoContainer.innerHTML = '<p>Erro ao carregar o vídeo</p>';
    }
    
    // Configurar botões de materiais
    const botoesContainer = conteudoAula.querySelector('.botoes-container');
    if (botoesContainer) {
        botoesContainer.style.display = 'block';
        
        // Configurar botão de downloads
        const btnDownloads = document.getElementById('btn-downloads');
        const downloadsContainer = document.getElementById('downloads-container');
        if (btnDownloads && downloadsContainer) {
            btnDownloads.onclick = () => {
                const downloadsLista = downloadsContainer.querySelector('.downloads-lista');
                downloadsLista.innerHTML = '';
                
                if (aula.downloads && aula.downloads.length > 0) {
                    aula.downloads.forEach(download => {
                        const downloadItem = document.createElement('div');
                        downloadItem.className = 'download-item';
                        downloadItem.style.cursor = 'pointer';
                        downloadItem.onclick = () => {
                            const pdfViewer = document.getElementById('pdf-viewer');
                            const pdfIframe = document.getElementById('pdf-iframe');
                            pdfIframe.src = download.url;
                            pdfViewer.style.display = 'block';
                        };
                        downloadItem.innerHTML = `
                            <div class="download-icon">
                                <i class="fas fa-file-${download.tipo}"></i>
                            </div>
                            <div class="download-info">
                                <div class="download-titulo">${download.titulo}</div>
                                <div class="download-tipo">${download.tipo.toUpperCase()}</div>
                            </div>
                        `;
                        downloadsLista.appendChild(downloadItem);
                    });
                } else {
                    downloadsLista.innerHTML = '<p>Nenhum download disponível</p>';
                }
                
                downloadsContainer.style.display = downloadsContainer.style.display === 'none' ? 'block' : 'none';
                audiosContainer.style.display = 'none';
            };
        }
        
        // Configurar botão de áudios
        const btnAudios = document.getElementById('btn-audios');
        const audiosContainer = document.getElementById('audios-container');
        if (btnAudios && audiosContainer) {
            btnAudios.onclick = () => {
                const audiosLista = audiosContainer.querySelector('.audio-lista');
                audiosLista.innerHTML = '';
                
                if (aula.audios && aula.audios.length > 0) {
                    aula.audios.forEach(audio => {
                        const audioItem = document.createElement('div');
                        audioItem.className = 'audio-item';
                        audioItem.innerHTML = `
                            <div class="audio-info">
                                <div class="audio-titulo">${audio.titulo}</div>
                                <div class="audio-duracao">${audio.duracao || ''}</div>
                                <audio controls controlsList="nodownload" preload="auto" style="width: 100%;">
                                    <source src="${audio.url}" type="audio/mpeg">
                                    <source src="${audio.url}" type="audio/mp3">
                                    Seu navegador não suporta o elemento de áudio.
                                </audio>
                            </div>
                        `;
                        
                        const audioElement = audioItem.querySelector('audio');
                        
                        // Forçar carregamento do áudio
                        audioElement.load();
                        
                        // Adicionar eventos para monitorar o carregamento
                        audioElement.addEventListener('loadedmetadata', () => {
                            console.log('Áudio carregado com sucesso:', audio.titulo);
                        });
                        
                        audioElement.addEventListener('error', (e) => {
                            console.error('Erro ao carregar áudio:', e);
                            console.log('URL do áudio com erro:', audio.url);
                            audioItem.querySelector('.audio-info').innerHTML = `
                                <div class="audio-titulo">${audio.titulo}</div>
                                <div class="audio-erro" style="color: red; margin-top: 5px;">
                                    Erro ao carregar o áudio. Verifique se o arquivo existe no Firebase Storage.
                                </div>
                            `;
                        });
                        
                        audiosLista.appendChild(audioItem);
                    });
                } else {
                    audiosLista.innerHTML = '<p>Nenhum áudio disponível</p>';
                }
                
                audiosContainer.style.display = audiosContainer.style.display === 'none' ? 'block' : 'none';
                downloadsContainer.style.display = 'none';
            };
        }
    }
    
    // Atualizar lista de próximas aulas
    atualizarListaProximasAulas(aula, todasAulas);
}

// Função para atualizar lista de próximas aulas
function atualizarListaProximasAulas(aulaAtual, todasAulas) {
    const listaProximas = document.getElementById('lista-proximas-aulas');
    if (!listaProximas) return;
    
    listaProximas.innerHTML = '';
    
    todasAulas.forEach(aula => {
        const li = document.createElement('li');
        li.className = `proxima-aula-item ${aula.id === aulaAtual.id ? 'aula-atual' : ''}`;
        li.onclick = () => carregarAula(aula, todasAulas);
        
        const videoId = getYouTubeVideoId(aula.youtubeUrl);
        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
        
        li.innerHTML = `
            <div class="proxima-aula-thumbnail">
                <img src="${thumbnailUrl}" alt="${aula.titulo}">
            </div>
            <div class="proxima-aula-info">
                <div class="proxima-aula-titulo">${aula.titulo}</div>
            </div>
        `;
        listaProximas.appendChild(li);
    });
    
    // Mostrar/esconder lista de próximas aulas
    const proximasAulas = document.querySelector('.proximas-aulas');
    const toggleButton = document.querySelector('.toggle-proximas-aulas');
    
    if (proximasAulas && toggleButton) {
        if (todasAulas.length > 1) {
            proximasAulas.style.display = 'block';
            toggleButton.style.display = 'flex';
        } else {
            proximasAulas.style.display = 'none';
            toggleButton.style.display = 'none';
        }
    }
}

// Função para extrair o ID do vídeo do YouTube da URL
function getYouTubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Função para voltar à tela inicial
window.voltarParaInicio = function() {
    document.getElementById('conteudo-aula').style.display = 'none';
    document.getElementById('conteudo-inicial').style.display = 'block';
    
    document.querySelectorAll('.submodulo').forEach(sub => {
        sub.classList.remove('active');
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarModulos();
    
    // Setup do botão toggle
    const toggleButton = document.querySelector('.toggle-proximas-aulas');
    const proximasAulas = document.querySelector('.proximas-aulas');
    
    if (toggleButton && proximasAulas) {
        toggleButton.addEventListener('click', () => {
            const isVisible = proximasAulas.style.display === 'block';
            proximasAulas.style.display = isVisible ? 'none' : 'block';
            toggleButton.querySelector('.seta-proximas').style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }
    
    // Escutar mudanças em tempo real
    db.collection('modulos').onSnapshot(() => {
        carregarModulos();
    });
    
    db.collection('aulas').onSnapshot(() => {
        const moduloAtual = document.querySelector('.submodulo.active');
        if (moduloAtual) {
            const onclick = moduloAtual.getAttribute('onclick');
            const match = onclick.match(/selecionarSubmodulo\('([^']+)',\s*'([^']+)'\)/);
            if (match) {
                selecionarSubmodulo(match[1], match[2]);
            }
        }
    });
});
