let questionsData = null;          // loaded JSON
let currentChapter = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let totalQuestions = 0;
let quizActive = false;
let activeTimerInterval = null;
let timeRemainingSeconds = 15 * 60;
let quizSubmitted = false;

const chapterContainer = document.getElementById('chapter-buttons');
const quizContainer = document.getElementById('quiz-container');
const resultContainer = document.getElementById('result-container');

// ------------------ Helper functions ------------------
function resetQuizState() {
    if (activeTimerInterval) {
        clearInterval(activeTimerInterval);
        activeTimerInterval = null;
    }
    quizActive = false;
    quizSubmitted = false;
}

function stopTimer() {
    if (activeTimerInterval) clearInterval(activeTimerInterval);
    activeTimerInterval = null;
}

function startTimer() {
    stopTimer();
    timeRemainingSeconds = 15 * 60;
    updateTimerDisplay();
    activeTimerInterval = setInterval(() => {
        if (!quizActive || quizSubmitted) return;
        if (timeRemainingSeconds <= 1) {
            stopTimer();
            if (quizActive && !quizSubmitted) {
                alert("⏰ Time's up! Submitting your quiz.");
                evaluateQuiz(true);
            }
        } else {
            timeRemainingSeconds--;
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerSpan = document.getElementById('live-timer');
    if (timerSpan) {
        const mins = Math.floor(timeRemainingSeconds / 60);
        const secs = timeRemainingSeconds % 60;
        timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function renderChapterButtons() {
    if (!questionsData) return;
    chapterContainer.innerHTML = '';
    questionsData.chapters.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'chapter-btn';
        if (quizActive && currentChapter && currentChapter.id === ch.id) {
            btn.classList.add('active-chapter');
        }
        btn.innerHTML = `<i class="fas fa-book-open"></i> ${ch.title}`;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (quizActive) {
                alert("⚠️ You must finish your current quiz before starting a new chapter! Submit or complete it first.");
                return;
            }
            loadQuizMode(ch);
        });
        chapterContainer.appendChild(btn);
    });
}

// ---------- QUIZ MODE ----------
function loadQuizMode(chapter) {
    if (quizActive) return;
    resetQuizState();
    currentChapter = chapter;
    currentQuestionIndex = 0;
    totalQuestions = chapter.questions.length;
    userAnswers = new Array(totalQuestions).fill(null);
    quizActive = true;
    quizSubmitted = false;
    renderChapterButtons();
    renderQuizQuestion();
    startTimer();
}

function renderQuizQuestion() {
    if (!currentChapter) return;
    const q = currentChapter.questions[currentQuestionIndex];
    const answeredCount = userAnswers.filter(a => a !== null).length;
    const progressPercent = (answeredCount / totalQuestions) * 100;

    let html = `
        <div class="quiz-header">
            <div class="chapter-title"><i class="fas fa-flag-checkered"></i> ${currentChapter.title}</div>
            <div class="timer-box"><i class="fas fa-hourglass-half"></i> <span id="live-timer">15:00</span></div>
        </div>
        <div class="progress-container"><div class="progress-bar" style="width: ${progressPercent}%;"></div></div>
        <div class="question">
            <h3><i class="fas fa-question-circle"></i> Question ${currentQuestionIndex + 1} of ${totalQuestions} (ID: ${q.id})</h3>
            <p><strong>${q.question}</strong></p>
            <ul class="options">
    `;
    q.options.forEach((opt, optIdx) => {
        const checked = (userAnswers[currentQuestionIndex] === optIdx) ? 'checked' : '';
        html += `<li><label><input type="radio" name="option" value="${optIdx}" ${checked}> ${String.fromCharCode(65 + optIdx)}. ${opt}</label></li>`;
    });
    html += `</ul><div class="nav-buttons">`;

    if (currentQuestionIndex > 0) {
        html += `<button class="nav-btn" id="prev-btn"><i class="fas fa-chevron-left"></i> Previous</button>`;
    } else {
        html += `<button class="nav-btn" disabled><i class="fas fa-chevron-left"></i> Previous</button>`;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
        html += `<button class="nav-btn" id="next-btn">Next <i class="fas fa-chevron-right"></i></button>`;
    } else {
        html += `<button class="nav-btn" id="finish-btn"><i class="fas fa-check-double"></i> Finish Quiz</button>`;
    }
    html += `</div></div>`;
    quizContainer.innerHTML = html;

    const radios = document.querySelectorAll('input[name="option"]');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (!quizActive || quizSubmitted) return;
            userAnswers[currentQuestionIndex] = parseInt(e.target.value);
            updateProgressBarLive();
        });
    });

    if (currentQuestionIndex > 0) {
        document.getElementById('prev-btn')?.addEventListener('click', () => {
            if (!quizActive || quizSubmitted) return;
            saveCurrentAnswerFromDom();
            currentQuestionIndex--;
            renderQuizQuestion();
        });
    }
    if (currentQuestionIndex < totalQuestions - 1) {
        document.getElementById('next-btn')?.addEventListener('click', () => {
            if (!quizActive || quizSubmitted) return;
            saveCurrentAnswerFromDom();
            currentQuestionIndex++;
            renderQuizQuestion();
        });
    } else if (currentQuestionIndex === totalQuestions - 1) {
        document.getElementById('finish-btn')?.addEventListener('click', () => {
            if (!quizActive || quizSubmitted) return;
            saveCurrentAnswerFromDom();
            evaluateQuiz(false);
        });
    }
    updateTimerDisplay();
}

function saveCurrentAnswerFromDom() {
    const selected = document.querySelector('input[name="option"]:checked');
    if (selected && quizActive && !quizSubmitted) {
        userAnswers[currentQuestionIndex] = parseInt(selected.value);
    }
}

function updateProgressBarLive() {
    const answered = userAnswers.filter(a => a !== null).length;
    const percent = (answered / totalQuestions) * 100;
    const bar = document.querySelector('.progress-bar');
    if (bar) bar.style.width = percent + '%';
}

function evaluateQuiz(isTimeOut = false) {
    if (quizSubmitted) return;
    quizSubmitted = true;
    stopTimer();
    const questionsArr = currentChapter.questions;
    let correctCount = 0;
    let resultsHtml = `<div><h2><i class="fas fa-chart-simple"></i> Results — ${currentChapter.title}</h2>`;
    if (isTimeOut) resultsHtml += `<p class="warning-msg"><i class="fas fa-clock"></i> Time's up! Quiz auto-submitted.</p>`;
    resultsHtml += `<p>Answered: ${userAnswers.filter(a => a !== null).length} / ${totalQuestions}</p>`;

    questionsArr.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        const isCorrect = (userAns === q.correct);
        if (isCorrect) correctCount++;
        let optsHtml = '';
        q.options.forEach((opt, optIdx) => {
            let liClass = '';
            if (optIdx === q.correct) liClass = 'correct';
            else if (userAns === optIdx && !isCorrect) liClass = 'wrong';
            optsHtml += `<li class="${liClass}">${String.fromCharCode(65 + optIdx)}. ${opt}</li>`;
        });
        resultsHtml += `<div class="question" style="margin-top:18px;"><h4>${idx + 1}. ${q.question}</h4><ul class="options">${optsHtml}</ul><div class="explanation"><i class="fas fa-lightbulb"></i> ${q.explanation}</div></div>`;
    });
    resultsHtml += `<h3 style="margin: 20px 0 10px"><i class="fas fa-star"></i> Final Score: ${correctCount} / ${totalQuestions}</h3>`;
    resultsHtml += `<button class="restart-btn" id="global-restart-btn"><i class="fas fa-arrow-left"></i> ← Back to Chapters</button></div>`;
    quizContainer.innerHTML = resultsHtml;
    resultContainer.innerHTML = '';

    quizActive = false;
    currentChapter = null;
    renderChapterButtons();

    document.getElementById('global-restart-btn')?.addEventListener('click', () => {
        quizContainer.innerHTML = `<div style="text-align:center; padding: 40px;"><i class="fas fa-hand-pointer"></i><p>Select a chapter to start Quiz Mode.</p></div>`;
        renderChapterButtons();
    });
}

// ------------------ Load questions from JSON and start ------------------
fetch('questions.json')
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        questionsData = data;
        renderChapterButtons();   // show chapters, no quiz active yet
        quizContainer.innerHTML = `<div style="text-align:center; padding: 40px;"><i class="fas fa-hand-pointer" style="font-size: 2.5rem; color:#3b71fe;"></i><p style="margin-top: 16px;">Select a chapter to start QUIZ MODE (15min timed).</p></div>`;
    })
    .catch(error => {
        console.error('Error loading questions:', error);
        quizContainer.innerHTML = `<div style="color:red; padding:20px;">Failed to load questions. Please ensure questions.json is present and valid.</div>`;
    });


// message 

(function () {
    // ----- DOM elements -----
    const form = document.getElementById('messageForm');
    const nameInput = document.getElementById('nameInput');
    const emailInput = document.getElementById('emailInput');
    const messageInput = document.getElementById('messageInput');
    const listContainer = document.getElementById('listContainer');
    const countSpan = document.getElementById('count');
    // back home button container and button
    const backHomeContainer = document.getElementById('backHomeContainer');
    const backHomeBtn = document.getElementById('backHomeBtn');

    // helper to update message count + toggle empty placeholder
    function updateCountAndPlaceholder() {
        const items = document.querySelectorAll('.list-item:not(.empty-list)');
        const count = items.length;
        countSpan.textContent = `(${count})`;

        let emptyDiv = document.querySelector('.empty-list');
        if (!emptyDiv) {
            if (count === 0) {
                emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-list';
                emptyDiv.innerHTML = '<i class="fa-regular fa-message"></i> no messages yet · be the first to write';
                listContainer.appendChild(emptyDiv);
            }
        } else {
            emptyDiv.style.display = count > 0 ? 'none' : 'block';
        }
    }

    // create a new list item DOM element (name, email, message)
    function createListItem(name, email, message) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item';

        const fieldsDiv = document.createElement('div');
        fieldsDiv.className = 'item-fields';

        const nameField = document.createElement('div');
        nameField.className = 'item-field';
        nameField.innerHTML = '<i class="fas fa-user-circle"></i> <span class="field-name"></span>';
        nameField.querySelector('.field-name').textContent = name;

        const emailField = document.createElement('div');
        emailField.className = 'item-field';
        emailField.innerHTML = '<i class="fas fa-envelope"></i> <span class="field-email"></span>';
        emailField.querySelector('.field-email').textContent = email;

        const msgField = document.createElement('div');
        msgField.className = 'item-field';
        msgField.innerHTML = '<i class="fas fa-comment-dots"></i> <span class="field-message"></span>';
        msgField.querySelector('.field-message').textContent = message;

        fieldsDiv.appendChild(nameField);
        fieldsDiv.appendChild(emailField);
        fieldsDiv.appendChild(msgField);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('title', 'remove message');
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';

        itemDiv.appendChild(fieldsDiv);
        itemDiv.appendChild(deleteBtn);

        return itemDiv;
    }

    // function to add a new message to the top of the list
    function addMessageToList(name, email, message) {
        if (!name.trim() || !email.trim() || !message.trim()) return false;

        const newItem = createListItem(name.trim(), email.trim(), message.trim());

        const emptyDiv = document.querySelector('.empty-list');
        if (emptyDiv) emptyDiv.style.display = 'none';

        listContainer.prepend(newItem);
        updateCountAndPlaceholder();
        return true;
    }

    // remove item event delegation
    listContainer.addEventListener('click', (e) => {
        const deleteIcon = e.target.closest('.delete-btn');
        if (!deleteIcon) return;

        const listItem = deleteIcon.closest('.list-item');
        if (listItem) {
            listItem.remove();
            updateCountAndPlaceholder();

            const remaining = document.querySelectorAll('.list-item').length;
            if (remaining === 0) {
                let emptyDiv = document.querySelector('.empty-list');
                if (!emptyDiv) {
                    emptyDiv = document.createElement('div');
                    emptyDiv.className = 'empty-list';
                    emptyDiv.innerHTML = '<i class="fa-regular fa-message"></i> no messages yet · be the first to write';
                    listContainer.appendChild(emptyDiv);
                } else {
                    emptyDiv.style.display = 'block';
                }
            }
        }
    });

    // flag to show back to home button only after first submit
    let firstSubmitDone = false;

    // form submit handler (now uses fetch to send to StaticForms AND adds locally)
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // always prevent default to handle via fetch

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const message = messageInput.value.trim();

        // simple validation
        if (!name || !email || !message) {
            alert('❖ all fields are required ✎');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            alert('please enter a valid email address (e.g. name@domain.com)');
            return;
        }

        // Prepare form data for StaticForms
        const formData = new FormData(form);

        try {
            // Send to StaticForms API (triggers your email alert)
            const response = await fetch('https://api.staticforms.dev/submit', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                // If API fails, still add locally but warn user
                console.warn('StaticForms submission failed, but message saved locally.');
            } else {
                console.log('Message sent to StaticForms successfully.');
            }
        } catch (error) {
            console.error('Error submitting to StaticForms:', error);
            // Still add locally even if network fails
        }

        // Always add message to the local board
        const success = addMessageToList(name, email, message);
        if (success) {
            // clear form
            nameInput.value = '';
            emailInput.value = '';
            messageInput.value = '';
            nameInput.focus();

            // show the back to home button after first successful submit
            if (!firstSubmitDone) {
                backHomeContainer.style.display = 'flex';
                firstSubmitDone = true;
            }
        }
    });

    // smooth scroll to top when back home button is clicked
    backHomeBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // initial count update (0) and ensure back button hidden
    updateCountAndPlaceholder();
    backHomeContainer.style.display = 'none';
})();