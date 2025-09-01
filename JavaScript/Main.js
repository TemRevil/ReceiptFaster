// Import vision function
import { vision } from './GoogleCloud.js';
// -----------------------------------------
// Function to handle detected text
function Receipt(text) {
    console.log('Receipt Text:', text);
}

// Global variables for camera state
let currentStream = null;
let currentVideo = null;
let resizeObserver = null;

// Save cam box size
function saveCamSize(width, height) {
    const camSize = { width: width + 'px', height: height + 'px' };
    localStorage.setItem('camSize', JSON.stringify(camSize));
}

// Restore cam box size
function restoreCamSize() {
    const camElement = document.getElementById('cam');
    const savedSize = localStorage.getItem('camSize');
    
    if (savedSize) {
        const { width, height } = JSON.parse(savedSize);
        camElement.style.width = width;
        camElement.style.height = height;
    }
}

// Initialize ResizeObserver for cam box
function initResizeObserver() {
    const camElement = document.getElementById('cam');
    
    if (!resizeObserver) {
        resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                const height = entry.contentRect.height;
                
                // Ensure minimum size
                if (width < 150) {
                    camElement.style.width = '150px';
                    saveCamSize(150, height);
                } else if (height < 150) {
                    camElement.style.height = '150px';
                    saveCamSize(width, 150);
                } else {
                    saveCamSize(width, height);
                }
                
                // Ensure maximum size
                if (width > 600) {
                    camElement.style.width = '600px';
                    saveCamSize(600, height);
                }
                if (height > 520) {
                    camElement.style.height = '520px';
                    saveCamSize(width, 520);
                }
            }
        });
        resizeObserver.observe(camElement);
    }
}

// Camera Functionality
async function initCamera() {
    const camElement = document.getElementById('cam');
    
    // Restore saved cam size
    restoreCamSize();
    
    // Initialize resize observer
    initResizeObserver();
    
    // Add event listeners for camera controls
    const cameraModeSelect = document.getElementById('camera-mode');
    if (!cameraModeSelect.hasListener) {
        cameraModeSelect.addEventListener('change', () => {
            const selectedMode = cameraModeSelect.value;
            if (currentVideo) {
                updateVideoMode(currentVideo, selectedMode);
                localStorage.setItem('cameraMode', selectedMode);
            }
        });
        cameraModeSelect.hasListener = true;
    }

    // Handle camera flip
    const flipButton = document.getElementById('flip-cam');
    if (!flipButton.hasListener) {
        flipButton.addEventListener('click', () => {
            if (currentVideo) {
                const isFlippedState = localStorage.getItem('cameraFlip') === 'true';
                const newState = !isFlippedState;
                currentVideo.style.transform = `scaleX(${newState ? -1 : 1})`;
                localStorage.setItem('cameraFlip', newState);
            }
        });
        flipButton.hasListener = true;
    }

    // Initial camera start
    const video = await startCamera();
    if (!video) return;

    // Handle image upload
    const uploadButton = document.getElementById('upload-img');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    if (!uploadButton.hasListener) {
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });
        uploadButton.hasListener = true;
    }

    if (!fileInput.hasListener) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const img = document.createElement('img');
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = currentVideo ? currentVideo.style.objectFit : 'contain';
                
                // Stop the video stream
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                    currentStream = null;
                }
                
                // Remove current element and show image
                while (camElement.firstChild) {
                    camElement.removeChild(camElement.firstChild);
                }
                
                // Convert file to base64 for Vision API
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const imageData = event.target.result;
                    img.src = imageData;
                    camElement.appendChild(img);
                    currentVideo = null;
                    showAlert('Image uploaded successfully', false);
                    
                    // Analyze with Google Vision
                    await vision(imageData);
                };
                reader.readAsDataURL(file);
            }
        });
        fileInput.hasListener = true;
    }

    // Handle reset
    const resetButton = document.getElementById('reset-op');
    if (!resetButton.hasListener) {
        resetButton.addEventListener('click', async () => {
            await startCamera();
        });
        resetButton.hasListener = true;
    }

    // Handle Space Cadet
    if (!document.hasSpaceCadetListener) {
        document.addEventListener('keydown', SpaceCadet);
        document.hasSpaceCadetListener = true;
    }
}

// Function to start camera
async function startCamera() {
    try {
        // Stop any existing stream
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }
        });
        
        currentStream = stream;
        const camElement = document.getElementById('cam');
        
        // Clear any existing content
        while (camElement.firstChild) {
            camElement.removeChild(camElement.firstChild);
        }
        
        // Create and setup video element
        const video = document.createElement('video');
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'contain';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        
        // Apply saved camera mode if exists
        const savedMode = localStorage.getItem('cameraMode');
        if (savedMode) {
            updateVideoMode(video, savedMode);
            // Update select element to match saved mode
            const cameraModeSelect = document.getElementById('camera-mode');
            if (cameraModeSelect) {
                cameraModeSelect.value = savedMode;
            }
        }

        // Apply saved flip state if exists
        const isFlipped = localStorage.getItem('cameraFlip') === 'true';
        if (isFlipped) {
            video.style.transform = 'scaleX(-1)';
        }
        
        video.srcObject = stream;
        camElement.appendChild(video);
        currentVideo = video;
        
        // Wait for video to be ready
        await new Promise(resolve => {
            video.onloadedmetadata = resolve;
        });
        
        await video.play();
        return video;
        
    } catch (error) {
        console.error('Error starting camera:', error);
        showAlert('Failed to start camera. Please make sure you have granted camera permissions.', true);
        return null;
    }
}

// Function to update video mode
function updateVideoMode(video, mode) {
    // Save mode to localStorage
    localStorage.setItem('cameraMode', mode);

    // Apply the saved mode
    switch(mode) {
        case 'fit':
            video.style.objectFit = 'contain';
            video.style.width = '100%';
            video.style.height = '100%';
            break;
        case 'full':
            video.style.objectFit = 'cover';
            video.style.width = '100%';
            video.style.height = '100%';
            break;
        case '19:6':
            video.style.objectFit = 'cover';
            video.style.width = '100%';
            video.style.height = '31.6%';
            video.style.marginTop = 'auto';
            video.style.marginBottom = 'auto';
            break;
        case '16:9':
            video.style.objectFit = 'cover';
            video.style.width = '100%';
            video.style.height = '56.25%';
            video.style.marginTop = 'auto';
            video.style.marginBottom = 'auto';
            break;
        case '4:3':
            video.style.objectFit = 'cover';
            video.style.width = '100%';
            video.style.height = '75%';
            video.style.marginTop = 'auto';
            video.style.marginBottom = 'auto';
            break;
        case '1:1':
            video.style.objectFit = 'cover';
            video.style.width = '100%';
            video.style.height = '100%';
            break;
    }
}

// Handle B key for vision and N key for reset
document.addEventListener('keydown', async (e) => {
    if (e.code === 'KeyB') {
        const img = document.querySelector('#cam img');
        const video = document.querySelector('#cam video');
        
        if (img) {
            console.log('Loading...');
            await vision(img.src);
        } else if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            console.log('Loading...');
            await vision(canvas.toDataURL('image/jpeg'));
        }
    } else if (e.code === 'KeyN') {
        await startCamera();
        showAlert('Camera reset', false);
    }
});

// -----------------------------------------
// View Control
function initViewControl() {
    const els = {
        main: document.querySelector('.main-content'),
        list: document.querySelector('.receipts-data'),
        scan: document.getElementById('scan'),
        listBtn: document.getElementById('list')
    };

    const nav = e => {
        const show = e.type === 'click' ? e.target.id === 'list' :
                    e.type === 'wheel' ? e.deltaY > 0 :
                    e.type === 'touchend' && Math.abs(e.changedTouches[0].clientY - e.target.touchStart) > 50 ? 
                    e.changedTouches[0].clientY < e.target.touchStart : null;
        
        if (show === null || show === els.list.classList.contains('show')) return;
        
        els.main.classList.toggle('hide', show);
        els.list.classList.toggle('show', show);
        els.scan.classList.toggle('active', !show);
        els.listBtn.classList.toggle('active', show);
    };

    [['click', els.scan], ['click', els.listBtn], ['wheel', document], ['touchend', document]]
        .forEach(([event, el]) => el.addEventListener(event, nav));
    document.addEventListener('touchstart', e => e.target.touchStart = e.touches[0].clientY);
}

// Space Cadet function to handle space button
async function SpaceCadet(event) {
    const camElement = document.getElementById('cam');
    const video = camElement.querySelector('video');
    const img = camElement.querySelector('img');

    // Alt + Space: Analyze current image with Vision API
    if (event.altKey && event.code === 'Space') {
        event.preventDefault();
        if (img) {
            await vision(img.src);
        }
        return;
    }

    // Space only: Toggle between camera and captured frame
    if (event.code === 'Space' && !event.altKey) {
        event.preventDefault();
        
        // If we have an image, restart the camera
        if (img) {
            await startCamera();
            return;
        }
        
        // If we have active video, capture the frame
        if (video && currentStream) {
            // Create a canvas to capture the current frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            // Convert to image
            const imageData = canvas.toDataURL('image/jpeg');
            
            // Create an image element to display the captured frame
            const newImg = document.createElement('img');
            newImg.style.width = '100%';
            newImg.style.height = '100%';
            newImg.style.objectFit = video.style.objectFit;
            newImg.src = imageData;
            
            // Stop the video stream
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
                currentStream = null;
            }
            
            // Remove video element and show captured image
            while (camElement.firstChild) {
                camElement.removeChild(camElement.firstChild);
            }
            camElement.appendChild(newImg);
            currentVideo = null;
        }
    }
}

// Show Alerts
function showAlert(message, isError) {
    const alertDiv = document.querySelector('.alert');
    const alertMessage = document.querySelector('#alert');
    
    alertDiv.classList.remove('success', 'error', 'off');
    alertDiv.classList.add(isError ? 'error' : 'success');
    alertMessage.textContent = message;
    
    setTimeout(() => {
        alertDiv.classList.add('off');
        setTimeout(() => {
            alertMessage.textContent = '';
        }, 300);
    }, 5000);
}
// -----------------------------------------
// Initialize camera when page loads
document.addEventListener('DOMContentLoaded', () => {
    initCamera();
    initViewControl();
});
// -----------------------------------------
// EXPORTS
export { Receipt };