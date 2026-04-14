// --- Initialize Lenis Smooth Scroll ---
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);


// --- GSAP Animations ---
gsap.registerPlugin(ScrollTrigger);

// Kinetic reveal for Hero Title
const titleItems = document.querySelectorAll('#hero-title span');
gsap.from(titleItems, {
    y: 100,
    opacity: 0,
    stagger: 0.1,
    duration: 1.2,
    ease: "expo.out",
    delay: 0.5
});

// Global scroll reveal for elements with .reveal-fade
document.querySelectorAll('.reveal-fade').forEach((el) => {
    gsap.from(el, {
        scrollTrigger: {
            trigger: el,
            start: "top 95%",
            toggleActions: "play none none none"
        },
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "expo.out"
    });
});

// Parallax Background
gsap.to('.parallax-bg', {
    scrollTrigger: {
        trigger: '#hero',
        start: "top top",
        end: "bottom top",
        scrub: true
    },
    yPercent: 20
});

// Magnetic Buttons
const magneticBtns = document.querySelectorAll('.btn-magnetic');
magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, {
            x: x * 0.3,
            y: y * 0.3,
            duration: 0.2
        });
    });
    btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: "elastic.out(1, 0.3)"
        });
    });
});

// Interactive Tilt Gallery
const tiltImg = document.querySelector('.diamond-shape');
document.addEventListener('mousemove', (e) => {
    if (!tiltImg) return;
    const mouseX = (e.clientX / window.innerWidth) - 0.5;
    const mouseY = (e.clientY / window.innerHeight) - 0.5;
    gsap.to(tiltImg, {
        rotateY: mouseX * 20,
        rotateX: -mouseY * 20,
        duration: 1,
        ease: "power2.out"
    });
});
// --- Clinic Chatbot UI / Logic with Groq API ---
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const clinicSystemPrompt = `Voce e o assistente virtual da clinica Blue Diamond. 
Responda sempre em pt-BR, com tom acolhedor, profissional e focado em bem-estar.

Contexto:
- Estetica avancada: limpeza de pele, peeling, botox, preenchimento, capilar.
- Saude integrativa: acupuntura, saude da mulher (climatério/menopausa).

Tambem nao diga que faça agendamentos, vc ajuda o paciente a agendar com os métodos manuais, indicando ele ir pelo whatsapp

NUNCA invente dados. Peça as informações de forma educada antes de gerar o código.`;

// Global scope for chat elements
let chatForm, chatInput, chatFeed, clinicChatToggle, clinicChatClose, clinicChatWindow;

// Wrap chatbot init in a single DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    chatForm = document.getElementById('clinic-chat-form');
    chatInput = document.getElementById('clinic-chat-input');
    chatFeed = document.getElementById('clinic-chat-feed');
    clinicChatToggle = document.getElementById('clinic-chat-toggle');
    clinicChatClose = document.getElementById('clinic-chat-close');
    clinicChatWindow = document.getElementById('clinic-chat-window');

    if (clinicChatToggle && clinicChatWindow) {
        clinicChatToggle.addEventListener('click', (e) => {
            clinicChatWindow.classList.toggle('is-open');
        });
    }

    if (clinicChatClose && clinicChatWindow) {
        clinicChatClose.addEventListener('click', (e) => {
            clinicChatWindow.classList.remove('is-open');
        });
    }

    // Load history
    loadHistory();

    // Quick Actions
    document.querySelectorAll('[data-chat-prompt]').forEach(button => {
        button.addEventListener('click', () => {
            const prompt = button.dataset.chatPrompt;
            if (chatInput && chatForm) {
                chatInput.value = prompt;
                chatForm.dispatchEvent(new Event('submit'));
            }
        });
    });

    // Submit Logic
    if (chatForm && chatInput) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (!message) return;

            addMessage(message, true);
            chatInput.value = '';

            const history = getHistory();
            const apiMessages = [
                { role: 'system', content: clinicSystemPrompt },
                ...history.slice(-6).map(msg => ({
                    role: msg.isUser ? 'user' : 'assistant',
                    content: msg.text
                }))
            ];

            try {
                const response = await fetch(GROQ_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: apiMessages,
                        temperature: 0.7,
                        max_tokens: 500
                    })
                });

                const data = await response.json();
                let reply = data.choices[0]?.message?.content || 'Desculpe, tive um problema ao processar sua resposta.';

                if (reply.includes('[SCHEDULE]')) {
                    const match = reply.match(/\[SCHEDULE\](.*?)\[\/SCHEDULE\]/);
                    if (match) {
                        const schedulePart = match[1];
                        reply = reply.replace(/\[SCHEDULE\].*?\[\/SCHEDULE\]/, '🔍 Processando seu agendamento...');
                        addMessage(reply);

                        try {
                            const schedResponse = await fetch('http://localhost:3000/api/schedule', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: schedulePart
                            });
                            const schedData = await schedResponse.json();
                            if (schedData.success) {
                                addMessage(`🗓️ Tudo certo! Seu agendamento foi realizado com sucesso. Verifique o convite no seu e-mail.`);
                            } else {
                                addMessage(`⚠️ Ops, o servidor de agenda não conseguiu finalizar. Tente novamente em instantes.`);
                            }
                        } catch (err) {
                            addMessage(`⚠️ Não consegui conectar ao servidor de agenda. Certifique-se de que o backend Node está rodando.`);
                        }
                    } else {
                        addMessage(reply);
                    }
                } else {
                    addMessage(reply);
                }
            } catch (error) {
                console.error('Erro Chatbot:', error);
                addMessage('Ocorreu um erro na conexão. Tente novamente mais tarde.');
            }
        });
    }
});

// --- Chat Persistence & Memory ---
const STORAGE_KEY = 'blue_diamond_chat_history';

function getHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveToHistory(text, isUser) {
    const history = getHistory();
    history.push({ text, isUser });
    if (history.length > 20) history.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
    if (!chatFeed) return;
    const history = getHistory();
    if (history.length > 0) {
        chatFeed.innerHTML = '';
        history.forEach(msg => addMessage(msg.text, msg.isUser, false));
    }
}

function addMessage(text, isUser = false, shouldSave = true) {
    if (!chatFeed) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble px-4 py-3 rounded-2xl max-w-[85%] text-sm ${isUser ? 'bg-[#0D1B4C] text-white ml-auto' : 'bg-slate-100 text-slate-800'}`;
    bubble.textContent = text;
    chatFeed.appendChild(bubble);
    chatFeed.scrollTop = chatFeed.scrollHeight;

    if (shouldSave) saveToHistory(text, isUser);
}

// --- Results Swiper Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.result-card').forEach((card) => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('is-hovered');
        });

        card.addEventListener('mouseleave', () => {
            card.classList.remove('is-hovered');
        });
    });

    const resultsSwiper = new Swiper('.results-swiper', {
        slidesPerView: 1,
        spaceBetween: 20,
        centeredSlides: false,
        loop: true,
        speed: 800,
        grabCursor: true,
        slidesPerGroup: 1,
        autoplay: {
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
        },
        navigation: {
            nextEl: '.swiper-next-btn',
            prevEl: '.swiper-prev-btn',
        },
        breakpoints: {
            640: {
                slidesPerView: 1,
                spaceBetween: 20,
            },
            1024: {
                slidesPerView: 2,
                spaceBetween: 25,
            },
            1200: {
                slidesPerView: 2,
                spaceBetween: 30,
            },
        },
    });

    // --- Infinite Carousel: 4-at-a-time with seamless loop ---
    (function () {
        const track   = document.getElementById('marquee-track');
        const prevBtn = document.getElementById('sliderPrev');
        const nextBtn = document.getElementById('sliderNext');
        if (!track || !prevBtn || !nextBtn) return;

        const GAP_PX      = 16;   // 1rem
        const CARDS_STEP  = 4;    // avança 4 por clique
        let   currentIdx  = 0;

        // --- Clone cards for infinite illusion ---
        const originals = Array.from(track.querySelectorAll('.marquee-card'));
        originals.forEach(c => track.appendChild(c.cloneNode(true)));
        const totalCards = track.querySelectorAll('.marquee-card').length; // 12

        function cardWidth() {
            const c = track.querySelector('.marquee-card');
            return c ? c.offsetWidth + GAP_PX : 0;
        }

        function moveTo(idx, animate = true) {
            if (!animate) track.classList.add('no-transition');
            track.style.transform = `translateX(-${idx * cardWidth()}px)`;
            if (!animate) {
                // force reflow then restore transition
                void track.offsetWidth;
                track.classList.remove('no-transition');
            }
            currentIdx = idx;
        }

        // After transition ends: if we're in the cloned zone, silently reset
        track.addEventListener('transitionend', () => {
            const half = originals.length; // 6
            if (currentIdx >= half) {
                moveTo(currentIdx - half, false);
            } else if (currentIdx < 0) {
                moveTo(currentIdx + half, false);
            }
        });

        nextBtn.addEventListener('click', () => moveTo(currentIdx + CARDS_STEP));
        prevBtn.addEventListener('click', () => moveTo(currentIdx - CARDS_STEP));

        window.addEventListener('resize', () => moveTo(currentIdx, false));
    })();
});
