/*
 * Get various elements used during the demo from the DOM
 */
const hash        = document.location.hash;
const search      = document.location.search;
const currentUrlEl  = document.getElementById('current-url');
const clientIdForm  = document.getElementById('client-id-form');
const clientIdInput = document.getElementById('client-id');
const datoCMSTokenInput = document.getElementById('dato-cms-token');
const authLink      = document.getElementById('auth-url');
const appURL = 'https://deploy-preview-374--app.netlify.com';

/*
 * The state variable is used to guard against CSRF attacks as described in:
 * https://tools.ietf.org/html/rfc6749#section-10.12
 */
let state = null;

/*
 * Handler for the client ID input field.
 *
 * Just used for this demo to get the Client ID for the newly registered app.
 * Normally your Client ID would be stored in a configuration file.
 */
function submitClientId(e) {
  e.preventDefault();

  var clientId = clientIdInput.value;
  var datoCMSToken = datoCMSTokenInput.value;
  if (clientId) {
    // We're stripping the trailing slash just in case you added
    // the site URL without trailing slash when creating the App
    var redirectURI = document.location.href;
    authLink.href = appURL + '/start/deploy?' +
        'client_id=' + clientId +
        '&response_type=token' +
        '&redirect_uri=' + encodeURIComponent(redirectURI) +
        '&state=' + state +
        '&repository=https://github.com/biilmann/dato-cms-deploy-demo' +
        '#DATO_CMS_TOKEN=' + encodeURIComponent(datoCMSToken);
    setCurrentStep(2);
  }
}

/*
 * Parses a query params string "a=b&c=d" => {a: "b", c: "d"}
 */
function parseQueryParams(string) {
  return string.split('&').reduce((result, pair) => {
    const keyValue = pair.split('=');
    result[keyValue[0]] = keyValue[1];
    return result;
  }, {});
}


/*
 * This function is called when a user returns from Netlify and has accepted the
 * request to authorize your app.
 *
 * It extracts the token from the response and use it to do a simple API request
 * fetching the latest sites from the user from Netlify.
 */
function handleAccessToken() {
  // The access token is returned in the hash part of the document.location
  //   #access_token=1234&response_type=token
  const response = parseQueryParams(hash.substr(1));

  // Remove the token so it's not visible in the URL after we're done
  document.location.hash = '';

  if (!localStorage.getItem(response.state)) {
    // We need to verify the random state we set before starting the request,
    // otherwise this could be an access token from someone else than our user
    alert("CSRF Attack");
    return;
  }

  localStorage.removeItem(response.state);

  const query = parseQueryParams(search.substr(1));
  const token = response.access_token;

  // User the token to fetch the list of sites for the user
  fetch(`https://api.netlify.com/api/v1/sites/${query.site_id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then((response) => {
    response.json().then((site) => {
      const adminURL = `https://app.netlify.com/sites/${site.name}`;
      showOutput(`Your site is: <a href="${adminURL}/deploys/${query.deploy_id}" target="_blank">${site.url}</a>`);

      fetch(`https://api.netlify.com/api/v1/sites/${query.site_id}/build_hooks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then((response) => {
        response.json().then((hooks) => {
          showOutput(
            `Your site is: <a href="${adminURL}/deploys/${query.deploy_id}" target="_blank">${site.url}</a>` +
            `<h3>Build hooks: </h3><ul>${hooks.map((hook) => (`<li>
              <strong>${hook.title}</strong> ${hook.url}
            </li>`))}</ul>`
          );
        });
      });


    });
  }).catch((error) => {
    showOutput(`Error fetching sites: ${error}`);
  });
}


/*
 * Small helper method to change the current step and show the right element
 */
function setCurrentStep(step) {
  Array.from(document.querySelectorAll('.visible')).forEach((el) => el.classList.remove('visible'));
  document.getElementById('step-' + step).classList.add('visible');
}


/*
 * Small helper method to show some output in the last step of the flow
 */
function showOutput(text) {
  document.getElementById('output').innerHTML = text;
}


/*
 * The Oauth2 implicit grant flow works by sending the user to Netlify where she'll
 * be asked to grant authorization to your application. Netlify will then redirect
 * back to the Redirect URI on file for your app and set an access_token paramter
 * in the "hash" part of the URL.
 *
 * If we have any hash, it's because the user is coming back from Netlify and we
 * can start doing API requests on their behalf.
 *
 * If not, we'll trigger the first step and prepare to send the user to Netlify.
 */
if (hash) {
  setCurrentStep(3);
  handleAccessToken();
} else {
  currentUrlEl.textContent = document.location.href;
  clientIdForm.addEventListener('submit', submitClientId, false);
  setCurrentStep(1);

  // We generate a random state that we'll validate when Netlify redirects back to
  // our app.
  state = Math.random();
  localStorage.setItem(state, true);
}
