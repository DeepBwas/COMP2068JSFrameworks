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

// Footer JavaScript
let goUpDiv = document.getElementById('goUpDiv');
goUpDiv.addEventListener('click', function(){
    window.scrollTo({ top: 0, behavior: 'smooth' });
});