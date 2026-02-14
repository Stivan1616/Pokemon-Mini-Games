// CONFIG & STATE
const typeColors = {
    water: "#6390F0", fire: "#EE8130", grass: "#7AC74C", electric: "#F7D02C",
    ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1", ground: "#E2BF65",
    flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A", rock: "#B6A136",
    ghost: "#735797", dragon: "#6F35FC", dark: "#705746", steel: "#B7B7CE",
    fairy: "#D685AD", normal: "#A8A77A"
};

let seenTypeSignatures = new Set();
const MAX_RETRIES = 20;

// DOM ELEMENTS
const themes = {
    modern: document.getElementById('modernUI'),
    retro: document.getElementById('retroUI'),
    lobby: document.getElementById('lobbyScreen')
};
const inputs = {
    modern: document.getElementById('inputModern'),
    retro: document.getElementById('inputRetro')
};
const buttons = {
    modern: document.getElementById('btnModern'),
    retro: document.getElementById('btnRetro')
};

// --- INIT ---
function init() {
    // Start in Lobby
    activeTheme = 'modern'; // Default
    updateThemeClasses();

    // Event Listeners for Enters
    inputs.modern.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });
    inputs.retro.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });
}

function startGame(mode) {
    if (mode === 'random') {
        themes.lobby.classList.add('hidden');
        if (activeTheme === 'modern') {
            themes.modern.classList.remove('hidden');
        } else {
            themes.retro.classList.remove('hidden');
        }

        // Reset Game State
        score = 0;
        streak = 0;
        lives = 5;
        seenTypeSignatures.clear(); // Clear history on new game
        fetchRandomSourcePokemon();
        updateUI();
    }
}

// --- THEME SWITCHING ---
// --- THEME SWITCHING ---
function toggleTheme() {
    activeTheme = activeTheme === 'modern' ? 'retro' : 'modern';
    updateThemeClasses();
}

function updateThemeClasses() {
    // Update Lobby Theme
    if (activeTheme === 'modern') {
        themes.lobby.classList.remove('retro');
        themes.lobby.classList.add('modern');
        document.body.classList.remove('retro-active'); // For modal
    } else {
        themes.lobby.classList.remove('modern');
        themes.lobby.classList.add('retro');
        document.body.classList.add('retro-active'); // For modal
    }

    // If game is active (lobby hidden), flip UIs
    if (themes.lobby.classList.contains('hidden')) {
        if (activeTheme === 'modern') {
            themes.retro.classList.add('hidden');
            themes.modern.classList.remove('hidden');
            inputs.modern.focus();
        } else {
            themes.modern.classList.add('hidden');
            themes.retro.classList.remove('hidden');
            inputs.retro.focus();
        }
    }
    updateUI();
}

// --- GAME LOGIC ---
function updateUI() {
    // Update Score
    document.getElementById('scoreModern').textContent = score;
    document.getElementById('scoreRetro').textContent = score.toString().padStart(3, '0');

    // Update Lives
    const hearts = '❤'.repeat(lives) + '♡'.repeat(5 - lives);
    document.getElementById('livesModern').textContent = hearts;
    document.getElementById('livesRetro').textContent = hearts;

    if (lives <= 2) {
        document.getElementById('livesRetro').style.color = '#FF0000';
    } else {
        document.getElementById('livesRetro').style.color = '#FF3B3B';
    }

    // Sync Inputs
    const activeVal = inputs[activeTheme].value;
    inputs.modern.value = activeVal;
    inputs.retro.value = activeVal;
}

// NEW LOGIC: Fetch Random Pokemon to ensure valid types combination
async function fetchRandomSourcePokemon() {
    if (lives <= 0) return;

    // Clear previous types UI
    document.getElementById("typesModern").innerHTML = '<span style="font-size:0.9rem;opacity:0.7">Buscando rastros...</span>';
    document.getElementById("typesRetro").innerHTML = '<span style="font-size:8px;color:#aaa">LOADING...</span>';
    clearFeedback();
    inputs.modern.value = "";
    inputs.retro.value = "";
    setBtnLoading(true);

    // Retry logic for unique combinations
    let attempts = 0;
    let newTypes = [];
    let signature = "";
    let foundUnique = false;

    while (attempts < MAX_RETRIES && !foundUnique) {
        attempts++;
        const randomId = Math.floor(Math.random() * 898) + 1; // Gen 1-8

        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();

            newTypes = data.types.map(t => t.type.name).sort(); // Sort to ensure consistent signature
            signature = newTypes.join(",");

            if (!seenTypeSignatures.has(signature)) {
                foundUnique = true;
                seenTypeSignatures.add(signature);
                currentTypes = newTypes; // update global
            } else {
                console.log(`Skipping duplicate combination: ${signature} (Attempt ${attempts})`);
            }
        } catch (err) {
            console.error(err);
        }
    }

    if (!foundUnique) {
        console.warn("Could not find unique combination after retries. Resetting history.");
        seenTypeSignatures.clear();
        // Just use the last fetched one
        if (newTypes.length > 0) {
            currentTypes = newTypes;
            seenTypeSignatures.add(signature);
        }
    }

    renderTypes();
    setBtnLoading(false);
    inputs[activeTheme].focus();
}

function renderTypes() {
    // Helper to render
    const render = (containerId) => {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
        currentTypes.forEach(type => {
            const b = document.createElement("div");
            b.className = "type-badge";
            b.style.background = typeColors[type];
            b.textContent = type;
            container.appendChild(b);
        });
    };

    render("typesModern");
    render("typesRetro");
}

function setBtnLoading(loading) {
    const txtM = loading ? "..." : "Comprobar";
    const txtR = loading ? "..." : "CHECK";
    buttons.modern.textContent = txtM;
    buttons.modern.disabled = loading;
    buttons.retro.textContent = txtR;
    buttons.retro.disabled = loading;
}

function clearFeedback() {
    const elM = document.getElementById('feedbackModern');
    const elR = document.getElementById('feedbackRetro');
    if (elM) {
        elM.textContent = "";
        elM.classList.remove('fade-out');
    }
    if (elR) {
        elR.textContent = "";
        elR.classList.remove('fade-out');
    }
    clearTimeout(feedbackTimeout);
}

// MODIFIED FEEDBACK LOGIC
let feedbackTimeout;
function showFeedback(msg, type) {
    const elM = document.getElementById('feedbackModern');
    const elR = document.getElementById('feedbackRetro');

    // Clear existing timeout/classes
    clearTimeout(feedbackTimeout);
    elM.classList.remove('fade-out');
    elR.classList.remove('fade-out');

    elM.textContent = msg;
    elM.style.opacity = '1';
    elM.style.color = type === 'error' ? 'var(--error)' : (type === 'success' ? 'var(--success)' : 'var(--warning)');

    elR.textContent = msg.toUpperCase();
    elR.style.opacity = '1';
    elR.style.color = type === 'error' ? '#FF3B3B' : (type === 'success' ? '#4caf50' : '#FFCB05');

    // Auto fade out after 2 seconds
    feedbackTimeout = setTimeout(() => {
        elM.classList.add('fade-out');
        elR.classList.add('fade-out');
        // Clear text after animation (1s)
        setTimeout(() => {
            if (elM.classList.contains('fade-out')) {
                elM.textContent = "";
                elR.textContent = "";
                elM.classList.remove('fade-out');
                elR.classList.remove('fade-out');
            }
        }, 1000);
    }, 2000);
}

function triggerConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

// NEW: LOPUNNY STREAK ANIMATION
// NEW: LOPUNNY STREAK ANIMATION
function checkStreak() {
    if (streak <= 0 || streak > 1000) return;

    let shouldAnnounce = false;

    // Rule: "debe haber racha de 5 en 5 hasta llegar a las 20"
    if (streak <= 20) {
        if (streak % 5 === 0) shouldAnnounce = true;
    }
    // Rule: "a partir de las 20, que se de enunciado de racha solo cada 10"
    else {
        if (streak % 10 === 0) shouldAnnounce = true;
    }

    if (shouldAnnounce) {
        try {
            showSpecialOverlay(`¡RACHA DE ${streak}!`, 'happy');
        } catch (e) {
            console.error("Streak overlay error:", e);
        }
    }
}

function showSpecialOverlay(text, mode) { // mode: 'happy' | 'sad'
    const overlay = document.getElementById('specialOverlay');
    const msg = document.getElementById('streakMsg');
    const img = document.getElementById('lopunnyAnim');

    // Safety check - IF user is missing HTML, prevent crash
    if (!overlay || !msg || !img) {
        console.warn("Overlay elements missing!");
        return;
    }

    msg.textContent = text;
    img.classList.remove('hidden', 'sad-filter');

    if (mode === 'happy') {
        img.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/428.gif"; // Lopunny Anim
        triggerConfetti();
    } else {
        img.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/428.png"; // Static for Sad
        img.classList.add('sad-filter');
    }

    // Add event listener to hide image if it fails to load (User Request: "si no logras cargar el enunciado, mejor retirar")
    img.onerror = function () {
        img.style.display = 'none'; // Hide broken image
    };
    img.style.display = 'block'; // Ensure it's visible if loaded

    overlay.classList.add('active');

    // Hide after 3s
    setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => img.classList.add('hidden'), 500);
    }, 3000);
}

async function checkAnswer() {
    if (lives <= 0) return;

    const name = inputs[activeTheme].value.toLowerCase().trim();
    if (!name) return;

    setBtnLoading(true);

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);

        if (!res.ok) {
            showFeedback("Pokémon no encontrado / Typo", "warning");
            inputs[activeTheme].classList.add('shake');
            setTimeout(() => inputs[activeTheme].classList.remove('shake'), 400);
            setBtnLoading(false);
            return;
        }

        const data = await res.json();
        const pokeTypes = data.types.map(t => t.type.name);

        const isCorrect = pokeTypes.length === currentTypes.length &&
            currentTypes.every(t => pokeTypes.includes(t)) &&
            pokeTypes.every(t => currentTypes.includes(t));

        if (isCorrect) {
            score++;
            streak++; // Increment Streak
            showFeedback("¡Correcto!", "success");
            triggerConfetti();
            checkStreak(); // Check for 5, 10, etc.
            updateUI();

            setTimeout(() => {
                fetchRandomSourcePokemon();
            }, 1500);
        } else {
            deductLife();
            streak = 0; // Reset Streak
            if (lives > 0) {
                showFeedback("Tipos incorrectos. -1 Vida.", "error");

                // AUTO-CLEAR INPUT ON WRONG ANSWER
                inputs[activeTheme].value = "";
                inputs[activeTheme].focus();

                inputs[activeTheme].classList.add('shake');
                setTimeout(() => inputs[activeTheme].classList.remove('shake'), 400);
            }
            setBtnLoading(false);
        }

    } catch (e) {
        console.error("CheckAnswer Error:", e);
        showFeedback("Error de conexión", "error");
        setBtnLoading(false);
    }
}

function skip() {
    if (lives <= 0) return;
    deductLife();
    streak = 0; // Reset Streak
    if (lives > 0) {
        showFeedback("Saltado (-1 Vida)", "warning");
        fetchRandomSourcePokemon();
    }
}

function deductLife() {
    lives--;
    updateUI();
    if (lives <= 0) {
        // GAME OVER LOGIC
        try {
            showSpecialOverlay("GAME OVER", 'sad');
        } catch (e) { console.error("Overlay error path:", e); }

        showFeedback("GAME OVER", "error");

        setTimeout(() => {
            alert(`GAME OVER\nPuntaje Final: ${score}`);
            resetGame();
        }, 500);
    }
}

function resetGame() {
    score = 0;
    lives = 5;
    streak = 0;
    fetchRandomSourcePokemon();
    updateUI();
}

// --- NAVIGATION & HOME BUTTON ---
function tryExit() {
    // If no progress (score 0, fresh game), exit immediately
    if (score === 0 && streak === 0 && lives === 5) {
        returnToLobby();
        return;
    }
    // Else show confirmation
    document.getElementById('confirmationModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('confirmationModal').classList.add('hidden');
}

function confirmExit() {
    closeModal();
    returnToLobby();
}

function returnToLobby() {
    // Hide Game UIs
    themes.modern.classList.add('hidden');
    themes.retro.classList.add('hidden');

    // Show Lobby
    themes.lobby.classList.remove('hidden');

    // Reset State (so next game starts fresh)
    resetGame();
}

// Start Game
init();
