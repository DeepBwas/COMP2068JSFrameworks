function togglePasswordVisibility(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const eyeIcon = passwordField.parentElement.querySelector('.password-toggle img');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        eyeIcon.src = 'images/eye-off.svg';
    } else {
        passwordField.type = 'password';
        eyeIcon.src = 'images/eye.svg';
    }
}