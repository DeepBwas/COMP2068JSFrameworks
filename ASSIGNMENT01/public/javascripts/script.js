// This file is for overall frontend  UI functionality JavaScript
// Deep Biswas - 200554126

// Header JavaScript
var path = window.location.pathname;
var page = path.split("/").pop();
switch (page) {
    case '':
        var home = document.getElementById('homeNav');
        home.classList.add('active');
        break;
    case 'aboutme':
        var aboutme = document.getElementById('aboutMeNav');
        aboutme.classList.add('active');
        break;
    case 'projects':
        var projects = document.getElementById('projectsNav');
        projects.classList.add('active');
        break;
    case 'contactme':
        var contactme = document.getElementById('contactMeNav');
        contactme.classList.add('active');
        break;
}

// Home JavaScript
var animatedText = document.getElementById('homeAnimatedText');
var words = ['HTML', 'CSS', 'JavaScript', 'C#', 'Python', 'SQL', 'PHP', 'etc', 'Software Developer'];
var i = 0;
var j = 0;
var isDeleting = false;
var typeSpeed = 100;
var deleteSpeed = 70;
var endDelay = 250;
var finalWordDelay = 1500;

var typeWriter = () => {
    if (animatedText != null) {
        var currentWord = words[i];
        var currentLetter = currentWord.substring(0, j);
        animatedText.innerHTML = currentLetter;

        if (!isDeleting) {
            if (j < currentWord.length) {
                j++;
                setTimeout(typeWriter, typeSpeed);
            } else {
                if (i === words.length - 1) {
                    animatedText.style.color = '#fcee0a';
                    setTimeout(typeWriter, finalWordDelay);
                } else {
                    isDeleting = true;
                    setTimeout(typeWriter, endDelay);
                }
            }
        } else {
            if (j > 0) {
                j--;
                setTimeout(typeWriter, deleteSpeed);
            } else {
                isDeleting = false;
                i++;
                if (i >= words.length) {
                    i = words.length - 1;
                }
                setTimeout(typeWriter, typeSpeed);
            }
        }
    }
};

typeWriter();


// Footer JavaScript
let goUpDiv = document.getElementById('goUpDiv');
goUpDiv.addEventListener('click', function(){
    window.scrollTo({ top: 0, behavior: 'smooth' });
});