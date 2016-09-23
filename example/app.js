const params        = document.location.hash;
const currentUrlEl  = document.getElementById('current-url');
const clientIdForm  = document.getElementById('client-id-form');
const clientIdInput = document.getElementById('client-id');
const authLink      = document.getElementById('auth-url');

function setCurrentStep(step) {
  Array.from(document.querySelectorAll('.visible')).forEach((el) => el.classList.remove('visible'));
  document.getElementById('step-' + step).classList.add('visible');
}

function submitClientId(e) {
  e.preventDefault();

  var clientId = clientIdInput.value;
  if (clientId) {
    // We're stripping the trailing slash just in case you added
    // the site URL without trailing slash when creating the App
    var redirectURI = document.location.href.replace(/\/(#.*)?$/, '')
    authLink.href = 'https://app.netlify.com/authorize?' +
        'client_id=' + clientId +
        '&response_type=token' +
        '&redirect_uri=' + redirectURI;
    setCurrentStep(2);
  }
}

function handleAccessToken() {
  // The access token is returned in the hash part of the document.location
  //   #access_token=1234&response_type=token
  const response = params.replace(/^#/, '').split('&').reduce((result, pair) => {
    const keyValue = pair.split('=');
    result[keyValue[0]] = keyValue[1];
    return result;
  }, {});

  // Remove the token so it's not visible in the URL
  document.location.hash = '';

  // User the token to fetch the list of sites for the user
  fetch('https://api.netlify.com/api/v1/sites', {
    headers: {
      'Authorization': 'Bearer ' + response.access_token
    }
  }).then((response) => {
    response.json().then((json) => {
      showOutput('Your sites: ' + json.map((site) => `<a href="${site.url}">${site.url}</a>`).join(','));
    });
  }).catch((error) => {
    showOutput(`Error fetching sites: ${error}`);
  });
}

function showOutput(text) {
  document.getElementById('output').innerHTML = text;
}

currentUrlEl.textContent = document.location.href;
clientIdForm.addEventListener('submit', submitClientId, false);

if (params) {
  setCurrentStep(3);
  handleAccessToken();
} else {
  setCurrentStep(1);
}
