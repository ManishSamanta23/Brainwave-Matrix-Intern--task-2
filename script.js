/***************** Storage *****************/
const getUsers = () => JSON.parse(localStorage.getItem("blogusers") || "[]");
const setUsers = u => localStorage.setItem("blogusers", JSON.stringify(u));
const getPendingUsers = () => JSON.parse(localStorage.getItem("pendingusers") || "[]");
const setPendingUsers = u => localStorage.setItem("pendingusers", JSON.stringify(u));
const getPosts = () => JSON.parse(localStorage.getItem("blogposts") || "[]");
const setPosts = p => localStorage.setItem("blogposts", JSON.stringify(p));
const getCurrentUser = () => localStorage.getItem("bloguser");
const setCurrentUser = u => localStorage.setItem("bloguser", u);



/***************** OTP State Management *****************/
let registrationOTPData = null;
let loginOTPData = null;
let deletionOTPData = null;
let resendCooldown = 0;
let countdownInterval = null;

/***************** UI Navigation Functions *****************/
function showUsernameLogin() {
  qs("#username-login-form").style.display = "block";
  qs("#email-otp-login-form").style.display = "none";
  qs("#register-form").style.display = "none";
  qs("#username-login-btn").classList.add("active");
  qs("#email-otp-btn").classList.remove("active");
  resetAllOTPStates();
}

function showEmailOTPLogin() {
  qs("#username-login-form").style.display = "none";
  qs("#email-otp-login-form").style.display = "block";
  qs("#register-form").style.display = "none";
  qs("#email-otp-btn").classList.add("active");
  qs("#username-login-btn").classList.remove("active");
  resetAllOTPStates();
}

function showRegister() {
  qs("#username-login-form").style.display = "none";
  qs("#email-otp-login-form").style.display = "none";
  qs("#register-form").style.display = "block";
  qs("#email-otp-btn").classList.remove("active");
  qs("#username-login-btn").classList.remove("active");
  
  // Reset registration form to step 1
  qs("#registration-step-1").style.display = "block";
  qs("#registration-step-2").style.display = "none";
  resetAllOTPStates();
}

/***************** Registration with Email Verification *****************/
function initiateRegistration() {
  const username = val("#reg-username");
  const email = val("#reg-email");
  const password = val("#reg-password");
  
  if (!username || !email || !password) {
    msg("Please fill in all fields", "error");
    return;
  }
  
  if (!validEmail(email)) {
    msg("Please enter a valid email address", "error");
    return;
  }
  
  // Check if username or email already exists
  const existingUsers = getUsers();
  const pendingUsers = getPendingUsers();
  
  if (existingUsers.find(u => u.username === username) || pendingUsers.find(u => u.username === username)) {
    msg("Username already exists", "error");
    return;
  }
  
  if (existingUsers.find(u => u.email === email) || pendingUsers.find(u => u.email === email)) {
    msg("Email already registered", "error");
    return;
  }
  
  // Generate and send OTP for registration
  const otp = generate4DigitOTP();
  const expiry = Date.now() + (5 * 60 * 1000); // 5 minutes
  
  registrationOTPData = {
    username,
    email,
    password,
    otp,
    expiry,
    attempts: 0
  };
  
  // Add to pending users
  const pending = getPendingUsers();
  pending.push({
    username,
    email,
    password,
    timestamp: Date.now(),
    verified: false
  });
  setPendingUsers(pending);
  
// Replace these placeholders with your actual keys!
const EMAILJS_PUBLIC_KEY = "_w9RpCgAeMYKg5aQQ";
const EMAILJS_SERVICE_ID = "service_717eeoe";
const EMAILJS_TEMPLATE_ID = "template_2vyliw5";

// Initialize EmailJS
(function() {
  emailjs.init({publicKey: EMAILJS_PUBLIC_KEY});
})();
  // Send OTP email using EmailJS
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: email, 
    otp_code: otp,
    username: username,
    expiry_time: new Date(expiry).toLocaleTimeString()
  })
  async function sendOTPEmail(toEmail, otpCode, context) {
  // context = 'registration', 'login', or 'deletion' (for subject)
  let subject, message;
  if (context === 'registration') {
    subject = "Verify your new account";
    message = `Your email verification code is: ${otpCode}`;
  } else if (context === 'login') {
    subject = "Your login OTP code";
    message = `Your login code is: ${otpCode}`;
  } else {
    subject = "Account deletion OTP";
    message = `Your deletion code: ${otpCode}`;
  }

  const params = {
    to_email: toEmail,
    subject: subject,
    message: message,
    otp_code: otpCode,
    timestamp: new Date().toLocaleString()
  };

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      params
    );
    // Optional: show status message to user
    msg(`An OTP has been sent to ${toEmail}`, 'success');
    return true;
  } catch (e) {
    console.error("EmailJS error:", e);
    msg("Failed to send OTP email. Please check your email address or try again.", "error");
    return false;
  }
}

async function initiateRegistration() {
  // ...
  await sendOTPEmail(email, otp, 'registration'); // ✅ works!
}

document.getElementById("register-btn").onclick = async function() {
  // Now you can use await!
};
// Option 1: .then()
sendOTPEmail(email, otp, 'login').then(success => {
  if (success) {  }
});

// Option 2: async IIFE
(async function() {
  await sendOTPEmail(email, otp, 'login');
})();


  // Send OTP email
  sendRegistrationOTPEmail(email, otp);
  
  // Show step 2 (OTP verification)
  qs("#registration-step-1").style.display = "none";
  qs("#registration-step-2").style.display = "block";
  qs("#reg-email-display").textContent = email;
  
  // Focus first OTP input
  qs("#reg-otp-1").focus();
  
  startRegistrationExpiry();
  msg(`Verification code sent to ${email}`, "success");
}

function verifyRegistrationOTP() {
  if (!registrationOTPData) {
    msg("Please restart the registration process", "error");
    return;
  }
  
  const enteredOTP = getRegistrationOTPInput();
  
  if (enteredOTP.length !== 4) {
    msg("Please enter all 4 digits", "error");
    highlightEmptyRegistrationFields();
    return;
  }
  
  // Check expiry
  if (Date.now() > registrationOTPData.expiry) {
    msg("OTP has expired. Please restart registration", "error");
    resetRegistrationFlow();
    return;
  }
  
  // Check attempts limit
  registrationOTPData.attempts++;
  if (registrationOTPData.attempts > 5) {
    msg("Too many failed attempts. Please restart registration", "error");
    resetRegistrationFlow();
    return;
  }
  
  // Verify OTP
  if (enteredOTP === registrationOTPData.otp) {
    // Complete registration
    completeRegistration();
  } else {
    msg(`Invalid OTP. ${6 - registrationOTPData.attempts} attempts remaining`, "error");
    shakeRegistrationOTP();
  }
}

function completeRegistration() {
  const { username, email, password } = registrationOTPData;
  
  // Add user to verified users
  const users = getUsers();
  users.push({
    username,
    email,
    password,
    verified: true,
    registrationDate: new Date().toISOString()
  });
  setUsers(users);
  
  // Remove from pending users
  const pending = getPendingUsers().filter(u => u.email !== email);
  setPendingUsers(pending);
  
  // Clear registration data
  registrationOTPData = null;
  clearInterval(countdownInterval);
  
  msg("Registration completed successfully! Please log in.", "success");
  
  // Reset form and show login
  setTimeout(() => {
    resetRegistrationForm();
    showUsernameLogin();
  }, 2000);
}

function resendRegistrationOTP() {
  if (!registrationOTPData) {
    msg("Please restart the registration process", "error");
    return;
  }
  
  if (resendCooldown > 0) {
    msg(`Please wait ${resendCooldown} seconds before resending`, "info");
    return;
  }
  
  // Generate new OTP
  const newOTP = generate4DigitOTP();
  registrationOTPData.otp = newOTP;
  registrationOTPData.expiry = Date.now() + (5 * 60 * 1000);
  registrationOTPData.attempts = 0;
  
  sendRegistrationOTPEmail(registrationOTPData.email, newOTP);
  startRegistrationExpiry();
  startResendCooldown(60);
  
  msg("New verification code sent", "success");
}

function changeRegistrationEmail() {
  // Go back to step 1 with existing username and password
  qs("#registration-step-1").style.display = "block";
  qs("#registration-step-2").style.display = "none";
  
  // Clear email field for new input
  qs("#reg-email").value = "";
  qs("#reg-email").focus();
  
  // Clear OTP data
  registrationOTPData = null;
  clearInterval(countdownInterval);
  
  msg("Please enter a new email address", "info");
}

/***************** Login OTP Functions *****************/
function requestLoginOTP() {
  const email = val("#login-email");
  
  if (!email) {
    msg("Please enter your email address", "error");
    return;
  }
  
  if (!validEmail(email)) {
    msg("Please enter a valid email address", "error");
    return;
  }
  
  // Check if user exists and is verified
  const users = getUsers();
  const user = users.find(u => u.email === email && u.verified);
  
  if (!user) {
    msg("Email not found or not verified. Please register first.", "error");
    return;
  }
  
  if (resendCooldown > 0) {
    msg(`Please wait ${resendCooldown} seconds before requesting again`, "info");
    return;
  }
  
  // Generate login OTP
  const otp = generate4DigitOTP();
  const expiry = Date.now() + (5 * 60 * 1000);
  
  loginOTPData = {
    email,
    username: user.username,
    otp,
    expiry,
    attempts: 0
  };
  
  sendLoginOTPEmail(email, otp);
  
  // Show OTP section
  qs("#login-otp-section").style.display = "block";
  qs("#request-login-otp-btn").disabled = true;
  qs("#login-otp-1").focus();
  
  startLoginExpiry();
  startResendCooldown(60);
  
  msg(`Login code sent to ${email}`, "success");
}

function verifyLoginOTP() {
  if (!loginOTPData) {
    msg("Please request a login code first", "error");
    return;
  }
  
  const enteredOTP = getLoginOTPInput();
  
  if (enteredOTP.length !== 4) {
    msg("Please enter all 4 digits", "error");
    highlightEmptyLoginFields();
    return;
  }
  
  // Check expiry
  if (Date.now() > loginOTPData.expiry) {
    msg("Login code has expired. Please request a new one", "error");
    resetLoginOTP();
    return;
  }
  
  // Check attempts
  loginOTPData.attempts++;
  if (loginOTPData.attempts > 5) {
    msg("Too many failed attempts. Please try again later", "error");
    resetLoginOTP();
    return;
  }
  
  // Verify OTP
  if (enteredOTP === loginOTPData.otp) {
    // Successful login
    setCurrentUser(loginOTPData.username);
    msg("Login successful!", "success");
    
    // Clear login data
    loginOTPData = null;
    clearInterval(countdownInterval);
    
    setTimeout(() => showBlog(), 1500);
  } else {
    msg(`Invalid code. ${6 - loginOTPData.attempts} attempts remaining`, "error");
    shakeLoginOTP();
  }
}

function resendLoginOTP() {
  if (!loginOTPData) {
    msg("Please restart the login process", "error");
    return;
  }
  
  if (resendCooldown > 0) {
    msg(`Please wait ${resendCooldown} seconds before resending`, "info");
    return;
  }
  
  // Generate new OTP
  const newOTP = generate4DigitOTP();
  loginOTPData.otp = newOTP;
  loginOTPData.expiry = Date.now() + (5 * 60 * 1000);
  loginOTPData.attempts = 0;
  
  sendLoginOTPEmail(loginOTPData.email, newOTP);
  startLoginExpiry();
  startResendCooldown(60);
  
  msg("New login code sent", "success");
}

/***************** Traditional Username Login *****************/
function login() {
  const username = val("#login-username");
  const password = val("#login-password");
  
  if (!username || !password) {
    msg("Please enter username and password", "error");
    return;
  }
  
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password && u.verified);
  
  if (!user) {
    msg("Invalid credentials or account not verified", "error");
    return;
  }
  
  setCurrentUser(username);
  msg("Login successful!", "success");
  setTimeout(() => showBlog(), 1000);
}

/***************** Account Deletion Functions *****************/
function openDeletionModal() {
  qs("#delete-account-modal").style.display = "flex";
  qs("#deletion-method-selection").style.display = "block";
  qs("#deletion-otp-verification").style.display = "none";
  qs("#deletion-password-verification").style.display = "none";
  qs("#deletion-final-confirmation").style.display = "none";
}

function closeDeletionModal() {
  qs("#delete-account-modal").style.display = "none";
  
  // Clean up any ongoing deletion processes
  deletionOTPData = null;
  clearInterval(countdownInterval);
  
  // Reset all deletion form fields
  clearDeletionOTPInputs();
  qs("#deletion-password").value = "";
  qs("#confirm-deletion-checkbox").checked = false;
}

function chooseDeletionMethod(method) {
  if (method === 'otp') {
    initiateOTPDeletion();
  } else if (method === 'password') {
    qs("#deletion-method-selection").style.display = "none";
    qs("#deletion-password-verification").style.display = "block";
    qs("#deletion-password").focus();
  }
}

function initiateOTPDeletion() {
  const currentUsername = getCurrentUser();
  const users = getUsers();
  const user = users.find(u => u.username === currentUsername);
  
  if (!user) {
    msg("User not found", "error");
    return;
  }
  
  // Generate deletion OTP
  const otp = generate4DigitOTP();
  const expiry = Date.now() + (5 * 60 * 1000);
  
  deletionOTPData = {
    username: currentUsername,
    email: user.email,
    otp,
    expiry,
    attempts: 0
  };
  
  // Send deletion OTP email
  sendDeletionOTPEmail(user.email, otp);
  
  // Show OTP verification step
  qs("#deletion-method-selection").style.display = "none";
  qs("#deletion-otp-verification").style.display = "block";
  qs("#delete-otp-1").focus();
  
  startDeletionExpiry();
  msg("Deletion code sent to your email", "success");
}

function verifyDeletionOTP() {
  if (!deletionOTPData) {
    msg("Please restart the deletion process", "error");
    return;
  }
  
  const enteredOTP = getDeletionOTPInput();
  
  if (enteredOTP.length !== 4) {
    msg("Please enter all 4 digits", "error");
    highlightEmptyDeletionFields();
    return;
  }
  
  // Check expiry
  if (Date.now() > deletionOTPData.expiry) {
    msg("Deletion code has expired. Please try again", "error");
    backToDeletionMethod();
    return;
  }
  
  // Check attempts
  deletionOTPData.attempts++;
  if (deletionOTPData.attempts > 3) {
    msg("Too many failed attempts. Please try again later", "error");
    closeDeletionModal();
    return;
  }
  
  // Verify OTP
  if (enteredOTP === deletionOTPData.otp) {
    // Successful verification - delete account
    executeAccountDeletion();
  } else {
    msg(`Invalid code. ${4 - deletionOTPData.attempts} attempts remaining`, "error");
    shakeDeletionOTP();
  }
}

function verifyDeletionPassword() {
  const enteredPassword = val("#deletion-password");
  const confirmCheckbox = qs("#confirm-deletion-checkbox").checked;
  
  if (!enteredPassword) {
    msg("Please enter your password", "error");
    return;
  }
  
  if (!confirmCheckbox) {
    msg("Please confirm you understand this action cannot be undone", "warning");
    return;
  }
  
  // Verify password
  const currentUsername = getCurrentUser();
  const users = getUsers();
  const user = users.find(u => u.username === currentUsername && u.password === enteredPassword);
  
  if (!user) {
    msg("Incorrect password", "error");
    return;
  }
  
  // Password verified - delete account
  executeAccountDeletion();
}

function executeAccountDeletion() {
  const currentUsername = getCurrentUser();
  
  try {
    // Delete user from users array
    let users = getUsers();
    users = users.filter(u => u.username !== currentUsername);
    setUsers(users);
    
    // Delete all posts by this user
    let posts = getPosts();
    posts = posts.filter(p => p.author !== currentUsername);
    
    // Remove user's comments from remaining posts
    posts = posts.map(post => ({
      ...post,
      comments: post.comments.filter(c => c.author !== currentUsername)
    }));
    setPosts(posts);
    
    // Clear session
    setCurrentUser("");
    
    // Show success message
    qs("#deletion-otp-verification").style.display = "none";
    qs("#deletion-password-verification").style.display = "none";
    qs("#deletion-final-confirmation").style.display = "block";
    
    // Auto-close modal and redirect after 3 seconds
    setTimeout(() => {
      closeDeletionModal();
      qs("#auth-section").style.display = "block";
      qs("#blog-section").style.display = "none";
      qs("#delete-account-btn").style.display = "none";
      qs("#logout-btn").style.display = "none";
      showEmailOTPLogin();
    }, 3000);
    
  } catch (error) {
    console.error("Error during account deletion:", error);
    msg("An error occurred during account deletion. Please try again.", "error");
  }
}

function resendDeletionOTP() {
  if (!deletionOTPData) {
    msg("Please restart the deletion process", "error");
    return;
  }
  
  if (resendCooldown > 0) {
    msg(`Please wait ${resendCooldown} seconds before resending`, "info");
    return;
  }
  
  // Generate new OTP
  const newOTP = generate4DigitOTP();
  deletionOTPData.otp = newOTP;
  deletionOTPData.expiry = Date.now() + (5 * 60 * 1000);
  deletionOTPData.attempts = 0;
  
  sendDeletionOTPEmail(deletionOTPData.email, newOTP);
  startDeletionExpiry();
  startResendCooldown(60);
  
  msg("New deletion code sent", "success");
}

function backToDeletionMethod() {
  qs("#deletion-otp-verification").style.display = "none";
  qs("#deletion-password-verification").style.display = "none";
  qs("#deletion-method-selection").style.display = "block";
  
  // Clear deletion data
  deletionOTPData = null;
  clearInterval(countdownInterval);
  clearDeletionOTPInputs();
  qs("#deletion-password").value = "";
  qs("#confirm-deletion-checkbox").checked = false;
}

/***************** OTP Helper Functions *****************/
const generate4DigitOTP = () => Math.floor(1000 + Math.random() * 9000).toString();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Registration OTP Input Helpers
function getRegistrationOTPInput() {
  let otp = "";
  for (let i = 1; i <= 4; i++) {
    otp += val(`#reg-otp-${i}`);
  }
  return otp;
}

function highlightEmptyRegistrationFields() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#reg-otp-${i}`);
    if (!input.value) {
      input.classList.add("error");
      setTimeout(() => input.classList.remove("error"), 2000);
    }
  }
}

function shakeRegistrationOTP() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#reg-otp-${i}`);
    input.classList.add("error");
    setTimeout(() => input.classList.remove("error"), 500);
  }
  clearRegistrationOTPInputs();
}

function clearRegistrationOTPInputs() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#reg-otp-${i}`);
    input.value = "";
    input.classList.remove("filled");
  }
  qs("#reg-otp-1").focus();
}

// Login OTP Input Helpers
function getLoginOTPInput() {
  let otp = "";
  for (let i = 1; i <= 4; i++) {
    otp += val(`#login-otp-${i}`);
  }
  return otp;
}

function highlightEmptyLoginFields() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#login-otp-${i}`);
    if (!input.value) {
      input.classList.add("error");
      setTimeout(() => input.classList.remove("error"), 2000);
    }
  }
}

function shakeLoginOTP() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#login-otp-${i}`);
    input.classList.add("error");
    setTimeout(() => input.classList.remove("error"), 500);
  }
  clearLoginOTPInputs();
}

function clearLoginOTPInputs() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#login-otp-${i}`);
    input.value = "";
    input.classList.remove("filled");
  }
  qs("#login-otp-1").focus();
}

// Deletion OTP Input Helpers
function getDeletionOTPInput() {
  let otp = "";
  for (let i = 1; i <= 4; i++) {
    otp += val(`#delete-otp-${i}`);
  }
  return otp;
}

function highlightEmptyDeletionFields() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#delete-otp-${i}`);
    if (!input.value) {
      input.classList.add("error");
      setTimeout(() => input.classList.remove("error"), 2000);
    }
  }
}

function shakeDeletionOTP() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#delete-otp-${i}`);
    input.classList.add("error");
    setTimeout(() => input.classList.remove("error"), 500);
  }
  clearDeletionOTPInputs();
}

function clearDeletionOTPInputs() {
  for (let i = 1; i <= 4; i++) {
    const input = qs(`#delete-otp-${i}`);
    input.value = "";
    input.classList.remove("filled");
  }
  qs("#delete-otp-1")?.focus();
}

/***************** Email Simulation Functions *****************/
function sendRegistrationOTPEmail(email, otp) {
  console.log(`📧 REGISTRATION EMAIL TO: ${email}`);
  console.log(`🔐 VERIFICATION CODE: ${otp}`);
  console.log(`⏰ EXPIRES IN: 5 minutes`);
  
  // In development, show OTP in alert
  setTimeout(() => {
    alert(`📧 Registration Code: ${otp}\n\nSent to: ${email}\n\n(This is for testing - in production, check your email)`);
  }, 500);
}

function sendLoginOTPEmail(email, otp) {
  console.log(`📧 LOGIN EMAIL TO: ${email}`);
  console.log(`🔐 LOGIN CODE: ${otp}`);
  console.log(`⏰ EXPIRES IN: 5 minutes`);
  
  // In development, show OTP in alert
  setTimeout(() => {
    alert(`📧 Login Code: ${otp}\n\nSent to: ${email}\n\n(This is for testing - in production, check your email)`);
  }, 500);
}

function sendDeletionOTPEmail(email, otp) {
  console.log(`📧 DELETION EMAIL TO: ${email}`);
  console.log(`🔐 DELETION CODE: ${otp}`);
  console.log(`⚠️ WARNING: This will permanently delete your account!`);
  console.log(`⏰ EXPIRES IN: 5 minutes`);
  
  // In development, show OTP in alert
  setTimeout(() => {
    alert(`🗑️ Account Deletion Code: ${otp}\n\n⚠️ WARNING: This will permanently delete your account!\n\nSent to: ${email}\n\n(This is for testing - in production, check your email)`);
  }, 500);
}

/***************** Timer Functions *****************/
function startRegistrationExpiry() {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    if (!registrationOTPData) {
      clearInterval(countdownInterval);
      return;
    }
    
    const remaining = registrationOTPData.expiry - Date.now();
    
    if (remaining <= 0) {
      msg("Registration OTP has expired. Please restart", "error");
      resetRegistrationFlow();
      return;
    }
    
    updateCountdownDisplay(remaining, "#registration-step-2");
  }, 1000);
}

function startLoginExpiry() {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    if (!loginOTPData) {
      clearInterval(countdownInterval);
      return;
    }
    
    const remaining = loginOTPData.expiry - Date.now();
    
    if (remaining <= 0) {
      msg("Login code has expired. Please request a new one", "error");
      resetLoginOTP();
      return;
    }
    
    updateCountdownDisplay(remaining, "#login-otp-section");
  }, 1000);
}

function startDeletionExpiry() {
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    if (!deletionOTPData) {
      clearInterval(countdownInterval);
      return;
    }
    
    const remaining = deletionOTPData.expiry - Date.now();
    
    if (remaining <= 0) {
      msg("Deletion code has expired. Please try again", "error");
      backToDeletionMethod();
      return;
    }
    
    updateCountdownDisplay(remaining, "#deletion-otp-verification");
  }, 1000);
}

function updateCountdownDisplay(remaining, containerSelector) {
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const timeLeft = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  let countdownEl = qs(`${containerSelector} .countdown`);
  if (!countdownEl) {
    countdownEl = document.createElement('div');
    countdownEl.className = 'countdown';
    qs(containerSelector).appendChild(countdownEl);
  }
  
  countdownEl.textContent = `Code expires in: ${timeLeft}`;
  
  if (remaining < 60000) {
    countdownEl.classList.add('urgent');
  }
}

function startResendCooldown(seconds) {
  resendCooldown = seconds;
  const timer = setInterval(() => {
    resendCooldown--;
    if (resendCooldown <= 0) {
      clearInterval(timer);
      if (qs("#request-login-otp-btn")) {
        qs("#request-login-otp-btn").disabled = false;
      }
    }
  }, 1000);
}

/***************** Reset Functions *****************/
function resetAllOTPStates() {
  registrationOTPData = null;
  loginOTPData = null;
  deletionOTPData = null;
  clearInterval(countdownInterval);
  resetRegistrationForm();
  resetLoginOTP();
}

function resetRegistrationForm() {
  qs("#reg-username").value = "";
  qs("#reg-email").value = "";
  qs("#reg-password").value = "";
  qs("#registration-step-1").style.display = "block";
  qs("#registration-step-2").style.display = "none";
  clearRegistrationOTPInputs();
}

function resetRegistrationFlow() {
  registrationOTPData = null;
  clearInterval(countdownInterval);
  
  // Remove from pending users if exists
  if (registrationOTPData && registrationOTPData.email) {
    const pending = getPendingUsers().filter(u => u.email !== registrationOTPData.email);
    setPendingUsers(pending);
  }
  
  resetRegistrationForm();
  msg("Please start registration again", "warning");
}

function resetLoginOTP() {
  qs("#login-otp-section").style.display = "none";
  qs("#request-login-otp-btn").disabled = false;
  clearLoginOTPInputs();
  loginOTPData = null;
}

/***************** OTP Input Event Handlers *****************/
document.addEventListener("DOMContentLoaded", () => {
  // Registration OTP inputs
  setupOTPInputs("reg-otp", 4, verifyRegistrationOTP);
  
  // Login OTP inputs  
  setupOTPInputs("login-otp", 4, verifyLoginOTP);
  
  // Deletion OTP inputs
  setupOTPInputs("delete-otp", 4, verifyDeletionOTP);
  
  // Event listeners
  const logoutBtn = qs("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
  
  const deleteAccountBtn = qs("#delete-account-btn");
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", openDeletionModal);
  }
  
  // Close modal when clicking outside
  const modal = qs("#delete-account-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeDeletionModal();
      }
    });
  }
});

function setupOTPInputs(prefix, count, onComplete) {
  for (let i = 1; i <= count; i++) {
    const input = qs(`#${prefix}-${i}`);
    if (!input) continue;
    
    input.addEventListener("input", e => {
      const value = e.target.value;
      
      // Only allow digits
      if (!/^\d$/.test(value) && value !== "") {
        e.target.value = "";
        return;
      }
      
      if (value) {
        input.classList.add("filled");
        // Move to next input
        if (i < count) {
          qs(`#${prefix}-${i + 1}`).focus();
        }
      } else {
        input.classList.remove("filled");
      }
      
      // Auto-verify when all fields are filled
      if (i === count && value) {
        setTimeout(() => {
          let allFilled = true;
          for (let j = 1; j <= count; j++) {
            if (!qs(`#${prefix}-${j}`).value) {
              allFilled = false;
              break;
            }
          }
          if (allFilled) onComplete();
        }, 100);
      }
    });
    
    // Handle backspace
    input.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !input.value && i > 1) {
        const prevInput = qs(`#${prefix}-${i - 1}`);
        prevInput.focus();
        prevInput.value = "";
        prevInput.classList.remove("filled");
      }
    });
    
    // Handle paste
    input.addEventListener("paste", e => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text");
      const digits = pastedData.match(/\d/g);
      
      if (digits && digits.length >= count) {
        for (let j = 0; j < count; j++) {
          const targetInput = qs(`#${prefix}-${j + 1}`);
          if (targetInput) {
            targetInput.value = digits[j];
            targetInput.classList.add("filled");
          }
        }
        setTimeout(onComplete, 100);
      }
    });
  }
}

/***************** Message System *****************/
function msg(text, type) {
  const old = qs(".message");
  if (old) old.remove();
  
  const el = ce("div", "message " + type);
  el.textContent = text;
  qs("#auth-section").insertAdjacentElement("afterend", el);
  
  setTimeout(() => {
    if (el.parentNode) el.remove();
  }, 5000);
}

/***************** Blog Functions (Unchanged) *****************/
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}

function createPost() {
  const title = val("#post-title");
  const content = val("#post-content");

  if (!title || !content) {
    msg("Enter title & content", "error");
    return;
  }
  // Require at least a live photo or video
  if (!capturedPhotoData && !capturedVideoData) {
    msg("Please capture a photo or video.", "error");
    return;
  }
  const posts = getPosts();
  posts.unshift({
    id: Date.now(),
    author: getCurrentUser(),
    title,
    content,
    date: new Date().toLocaleString(),
    comments: [],
    photo: capturedPhotoData,
    video: capturedVideoData,
  });
  setPosts(posts);

  // Reset fields
  qs("#post-title").value = "";
  qs("#post-content").value = "";
  qs("#photo-input").value = "";
  qs("#video-input").value = "";
  qs("#photo-preview").src = "";
  qs("#video-preview").src = "";
  qs("#photo-preview").style.display = "none";
  qs("#video-preview").style.display = "none";
  capturedPhotoData = null;
  capturedVideoData = null;

  renderPosts();
}


function deletePost(id) {
  setPosts(getPosts().filter(p => p.id !== id));
  renderPosts();
}

function enableEditPost(id) {
  const post = getPosts().find(p => p.id === id);
  if (!post) return;
  const nt = prompt("Edit title", post.title);
  if (nt === null) return;
  const nc = prompt("Edit content", post.content);
  if (nc === null) return;
  post.title = nt.trim();
  post.content = nc.trim();
  setPosts(getPosts().map(p => p.id === id ? post : p));
  renderPosts();
}

function addComment(id) {
  const inp = qs(`#commentinput-${id}`);
  const text = inp.value.trim();
  if (!text) return;
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  post.comments.push({
    id: Date.now(),
    author: getCurrentUser(),
    text,
    date: new Date().toLocaleTimeString()
  });
  setPosts(posts);
  renderPosts();
}

function renderPosts() {
  const posts = getPosts();
  const user = getCurrentUser();
  qs("#posts-list").innerHTML = posts.map(post => `
    <div class='post-card'>
      <div class='post-actions' style='display:${post.author === user ? "flex" : "none"};'>
        <button onclick='enableEditPost(${post.id})'>✏️</button>
        <button onclick='deletePost(${post.id})'>🗑️</button>
      </div>
      <h3>${escapeHTML(post.title)}</h3>
      <div class='post-meta'>${post.author} • ${post.date}</div>
      <div>${escapeHTML(post.content)}</div>
      ${post.photo ? `<img src="${post.photo}" style="max-width:100%;margin:10px 0;border-radius:8px;"/>` : ""}
      ${post.video ? `<video src="${post.video}" style="max-width:100%;margin:10px 0;border-radius:8px;" controls></video>` : ""}
      <div class='comment-section'>
        <h4>Comments (${post.comments.length})</h4>
        <div>${post.comments.map(c => `
          <div class='comment'>
            <strong>${c.author}:</strong> ${escapeHTML(c.text)} 
            <small>${c.date}</small>
          </div>
        `).join("")}</div>
        <input id='commentinput-${post.id}' placeholder='Write a comment'/>
        <button onclick='addComment(${post.id})'>Add</button>
      </div>
    </div>
  `).join("");
}


/***************** Session Management *****************/
function logout() {
  setCurrentUser("");
  resetAllOTPStates();
  qs("#auth-section").style.display = "block";
  qs("#blog-section").style.display = "none";
  qs("#logout-btn").style.display = "none";
  qs("#delete-account-btn").style.display = "none";
  qs("#user-welcome").style.display = "none";
  showEmailOTPLogin();
}

function showBlog() {
  qs("#auth-section").style.display = "none";
  qs("#blog-section").style.display = "block";
  qs("#logout-btn").style.display = "inline-block";
  qs("#delete-account-btn").style.display = "inline-block";
  
  // Show welcome message
  const currentUser = getCurrentUser();
  qs("#user-welcome").textContent = `Welcome, ${currentUser}!`;
  qs("#user-welcome").style.display = "inline-block";
  
  renderPosts();
}

/***************** Utilities *****************/
const qs = sel => document.querySelector(sel);
const ce = (tag, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};
const val = sel => qs(sel)?.value.trim();

/***************** Global Function Exports *****************/
Object.assign(window, {
  showUsernameLogin,
  showEmailOTPLogin,
  showRegister,
  initiateRegistration,
  verifyRegistrationOTP,
  resendRegistrationOTP,
  changeRegistrationEmail,
  login,
  requestLoginOTP,
  verifyLoginOTP,
  resendLoginOTP,
  openDeletionModal,
  closeDeletionModal,
  chooseDeletionMethod,
  verifyDeletionOTP,
  verifyDeletionPassword,
  resendDeletionOTP,
  backToDeletionMethod,
  logout,
  createPost,
  deletePost,
  enableEditPost,
  addComment
});
let capturedPhotoData = null;
let capturedVideoData = null;

/***************** Initialize Application *****************/
window.onload = () => {
  if (getCurrentUser()) {
    showBlog();
  } else {
    showEmailOTPLogin();
  }
};
document.addEventListener("DOMContentLoaded", function() {
  // ...existing DOMContentLoaded code...

  // PHOTO CAPTURE and PREVIEW
  const photoInput = qs('#photo-input');
  const photoPreview = qs('#photo-preview');
  if (photoInput) {
    photoInput.addEventListener('change', function () {
      const file = this.files && this.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = function (e) {
          capturedPhotoData = e.target.result;
          photoPreview.src = e.target.result;
          photoPreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
      } else {
        capturedPhotoData = null;
        photoPreview.src = "";
        photoPreview.style.display = 'none';
      }
    });
  }

  // VIDEO CAPTURE and PREVIEW
  const videoInput = qs('#video-input');
  const videoPreview = qs('#video-preview');
  if (videoInput) {
    videoInput.addEventListener('change', function () {
      const file = this.files && this.files[0];
      if (file && file.type.startsWith("video/")) {
        const reader = new FileReader();
        reader.onload = function (e) {
          capturedVideoData = e.target.result;
          videoPreview.src = e.target.result;
          videoPreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
      } else {
        capturedVideoData = null;
        videoPreview.src = "";
        videoPreview.style.display = 'none';
      }
    });
  }
});
