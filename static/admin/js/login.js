function initLogin(adminPath) {
    const emailStep = document.querySelector('#emailStep');
    const passwordStep = document.querySelector('#passwordStep');
    const emailInput = emailStep.querySelector('input');
    const passwordInput = passwordStep.querySelector('input');

    /**
     * Focus an input and make sure it is editable.
     * The inputs are readonly until focused so mobile browsers do not pop the
     * keyboard on load; the inline onfocus handler removes the attribute, but
     * we remove it here too so programmatic focus behaves the same way.
     */
    function focusInput(input) {
        input.removeAttribute('readonly');
        input.focus();
        try {
            const end = input.value.length;
            input.setSelectionRange(end, end);
        } catch (e) {
            /* selection is not supported on every input type */
        }
    }

    function showPasswordStep() {
        emailStep.classList.remove('active');
        passwordStep.classList.add('active');
        focusInput(passwordInput);
    }

    function showEmailStep() {
        passwordStep.classList.remove('active');
        emailStep.classList.add('active');
        focusInput(emailInput);
    }

    focusInput(emailInput);

    // Show / hide password
    const revealBtn = document.querySelector('#revealBtn');
    revealBtn?.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        revealBtn.classList.toggle('active', isPassword);
        revealBtn.title = isPassword ? 'Hide password' : 'Show password';
        // keep the caret in the field so typing continues where it stopped
        focusInput(passwordInput);
    });

    // Touch handling for swipe - simplified
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });  // Add passive flag for better performance

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50; // minimum distance for swipe
        const diff = touchStartX - touchEndX;

        // Swipe left (email to password)
        if (diff > swipeThreshold && emailStep.classList.contains('active')) {
            showPasswordStep();
        }

        // Swipe right (password to email)
        if (diff < -swipeThreshold && passwordStep.classList.contains('active')) {
            showEmailStep();
        }
    }

    // Handle tab navigation
    emailInput.addEventListener('keydown', function (e) {
        // If Tab pressed and not with Shift -> jump to the password step
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            showPasswordStep();
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (emailInput.value) showPasswordStep();
        }
    });

    passwordInput.addEventListener('keydown', function (e) {
        // If Tab pressed with Shift (Shift+Tab) -> back to the email step
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            showEmailStep();
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            submit(e);
        }
    });

    function submit(e) {
        fetch(adminPath + "/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "email": emailInput.value,
                "password": passwordInput.value
            })
        }).then(response => response.json()).then(data => {
            if (data.success) {
                window.location.href = adminPath;
            } else if (data.error) {
                Notif.New({
                    title: 'Error occured',
                    message: data.error,
                    type: 'error',
                    duration: 4000
                }).show();
                // keep the caret in the password field so the user can retry
                focusInput(passwordInput);
            }
        }).catch(console.error);
    }

    return function (e) {
        e.preventDefault();
        submit(e);
    }
}
