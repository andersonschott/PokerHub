window.downloadFile = function (filename, contentType, base64) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = 'data:' + contentType + ';base64,' + base64;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
