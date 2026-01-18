function initLogin(adminPath) {
    const emailStep = document.querySelector('#emailStep');
    const passwordStep = document.querySelector('#passwordStep');
    const emailInput = emailStep.querySelector('input');
    const passwordInput = passwordStep.querySelector('input');
    emailInput.focus();

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
            emailStep.classList.remove('active');
            emailStep.classList.add('slide-left');
            passwordStep.classList.add('active');

            emailStep.addEventListener('transitionend', function focusPassword() {
                passwordInput.focus();
                emailStep.removeEventListener('transitionend', focusPassword);
            });
        }

        // Swipe right (password to email)
        if (diff < -swipeThreshold && passwordStep.classList.contains('active')) {
            passwordStep.classList.remove('active');
            emailStep.classList.remove('slide-left');
            emailStep.classList.add('active');

            passwordStep.addEventListener('transitionend', function focusEmail() {
                emailInput.focus();
                passwordStep.removeEventListener('transitionend', focusEmail);
            });
        }
    }

    // Handle tab navigation
    emailInput.addEventListener('keydown', function (e) {
        // If Tab pressed and not with Shift
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            emailStep.classList.remove('active');
            emailStep.classList.add('slide-left');
            passwordStep.classList.add('active');

            emailStep.addEventListener('transitionend', function focusPassword() {
                passwordInput.focus();
                emailStep.removeEventListener('transitionend', focusPassword);
            });
        }
    });

    passwordInput.addEventListener('keydown', function (e) {
        // If Tab pressed with Shift (Shift+Tab)
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            passwordStep.classList.remove('active');
            emailStep.classList.remove('slide-left');
            emailStep.classList.add('active');

            passwordStep.addEventListener('transitionend', function focusEmail() {
                emailInput.focus();
                passwordStep.removeEventListener('transitionend', focusEmail);
            });
        }
    });

    emailInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && this.value) {
            e.preventDefault();
            emailStep.classList.remove('active');
            emailStep.classList.add('slide-left');
            passwordStep.classList.add('active');

            emailStep.addEventListener('transitionend', function focusPassword() {
                passwordInput.focus();
                emailStep.removeEventListener('transitionend', focusPassword);
            });
        }
    });

    passwordInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && this.value) {
            e.preventDefault();
            handleSubmitLogin(e);
        }
    });

    return function (e) {
        e.preventDefault();
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
            }
        }).catch(console.error);
    }
} 