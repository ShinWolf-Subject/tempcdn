class FileUploader {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.results = document.getElementById('results');
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('drag-over');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        // File input
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Click drop zone
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });
    }

    handleFiles(files) {
        if (files.length === 0) return;
        this.uploadFile(files[0]);
    }

    uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // Use relative path that works for both local and Netlify
        const uploadUrl = window.location.hostname === 'localhost' ? '/upload' : '/api/upload';

        this.showProgress();

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                this.updateProgress(percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                this.showSuccess(response, file);
            } else {
                let error = 'Upload failed';
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    error = errorResponse.error || error;
                } catch (e) {}
                this.showError(error);
            }
            this.hideProgress();
        });

        xhr.addEventListener('error', () => {
            this.showError('Network error. Please try again.');
            this.hideProgress();
        });

        xhr.open('POST', uploadUrl);
        xhr.send(formData);
    }

    showProgress() {
        this.progressContainer.classList.remove('hidden');
        this.updateProgress(0);
    }

    hideProgress() {
        setTimeout(() => {
            this.progressContainer.classList.add('hidden');
        }, 1000);
    }

    updateProgress(percent) {
        this.progressBar.style.width = percent + '%';
        this.progressText.textContent = Math.round(percent) + '%';
    }

    showSuccess(response, file) {
        const fileSize = this.formatFileSize(file.size);
        const baseUrl = window.location.origin;
        
        const resultHTML = `
            <div class="bg-green-50 border border-green-200 rounded-xl p-6 fade-in">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center">
                        <i class="fas fa-check-circle text-green-500 text-2xl mr-3"></i>
                        <h3 class="text-lg font-semibold text-green-800">Upload Successful!</h3>
                    </div>
                    ${response.previewable ? 
                        '<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Preview Available</span>' : 
                        '<span class="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Download Only</span>'
                    }
                </div>
                
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-600">File Name</p>
                        <p class="font-medium truncate">${file.name}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">File Size</p>
                        <p class="font-medium">${fileSize}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Short Code</p>
                        <p class="font-mono font-bold text-blue-600">${response.shortCode}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Expires</p>
                        <p class="font-medium">${response.expiresAt}</p>
                    </div>
                </div>

                <!-- Download URL -->
                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">
                        <i class="fas fa-download mr-1"></i> Download URL:
                    </p>
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            value="${baseUrl}${response.downloadUrl}" 
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono bg-white"
                            readonly
                            id="download-url-${response.shortCode}"
                        >
                        <button 
                            onclick="copyToClipboard('download-url-${response.shortCode}')"
                            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 flex items-center"
                        >
                            <i class="fas fa-copy mr-2"></i> Copy
                        </button>
                    </div>
                </div>

                ${response.previewable ? `
                <!-- Preview URL -->
                <div class="mb-6">
                    <p class="text-sm text-gray-600 mb-2">
                        <i class="fas fa-eye mr-1"></i> Preview URL:
                    </p>
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            value="${baseUrl}${response.previewUrl}" 
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono bg-white"
                            readonly
                            id="preview-url-${response.shortCode}"
                        >
                        <button 
                            onclick="copyToClipboard('preview-url-${response.shortCode}')"
                            class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 flex items-center"
                        >
                            <i class="fas fa-copy mr-2"></i> Copy
                        </button>
                    </div>
                </div>
                ` : ''}

                <div class="flex space-x-3 flex-wrap gap-2">
                    <a 
                        href="${response.downloadUrl}" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 flex items-center"
                        download
                    >
                        <i class="fas fa-download mr-2"></i> Download
                    </a>
                    
                    ${response.previewable ? `
                    <a 
                        href="${response.previewUrl}" 
                        target="_blank"
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 flex items-center"
                    >
                        <i class="fas fa-eye mr-2"></i> Preview
                    </a>
                    ` : ''}
                </div>
            </div>
        `;

        this.results.insertAdjacentHTML('afterbegin', resultHTML);
    }

    showError(message) {
        const errorHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 fade-in">
                <div class="flex items-center">
                    <i class="fas fa-exclamation-circle text-red-500 text-2xl mr-3"></i>
                    <div>
                        <h3 class="text-lg font-semibold text-red-800">Upload Failed</h3>
                        <p class="text-red-600">${message}</p>
                    </div>
                </div>
            </div>
        `;

        this.results.insertAdjacentHTML('afterbegin', errorHTML);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Utility functions
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    element.setSelectionRange(0, 99999);
    document.execCommand('copy');
    
    const button = element.nextElementSibling;
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
    button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    button.classList.add('bg-green-500', 'hover:bg-green-600');
    
    setTimeout(() => {
        button.innerHTML = originalHtml;
        button.classList.remove('bg-green-500', 'hover:bg-green-600');
        button.classList.add('bg-blue-500', 'hover:bg-blue-600');
    }, 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new FileUploader();
});
