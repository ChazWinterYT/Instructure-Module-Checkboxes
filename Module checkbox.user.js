// ==UserScript==
// @name         Module checkbox
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Add checkboxes to modules for individual Instructure courses
// @author       Chaz Winter
// @match        https://ata.instructure.com/courses/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // Get all modules
    var modules = document.getElementsByClassName('module-item-title');

    // Extract the course number from the URL
    var courseNumber = window.location.href.match(/courses\/(\d+)/)[1];

    // Get the header bar
    var headerBar = document.querySelector('.header-bar');

    // Create an import button
    var importButton = document.createElement('button');
    importButton.textContent = 'Import';
    importButton.addEventListener('click', function() {
        // Create a file input element
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', function() {
            // Read the selected file
            var file = this.files[0];
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    // Parse the JSON string
                    var data = JSON.parse(e.target.result);
                    // Check that the data is an object
                    if (typeof data !== 'object' || data === null) {
                        throw new Error('Invalid data: not an object');
                    }
                    // Check the checkbox states. They should be boolean
                    for (var key in data) {
                        if (typeof data[key] !== 'boolean') {
                            throw new Error('Invalid data: not a boolean');
                        }
                        GM_setValue(key, data[key]);
                    }
                    // Reload the page to update the checkboxes
                    location.reload();
                } catch (error) {
                    // Handle any errors that occurred during the import process
                    alert('Failed to import checkbox states: ' + error.message);
                }
            };
            reader.onerror = function() {
                // Handle any errors that occurred during the file reading process
                alert('Failed to read file: ' + reader.error.message);
            };
            reader.readAsText(file);
        });
        // This is how you trigger a file selection dialog box, apparently
        input.style.display = 'none';
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });

    // Create an export button
    var exportButton = document.createElement('button');
    exportButton.textContent = 'Export';
    exportButton.addEventListener('click', function() {
        // Collect the checkbox states
        var data = {};
        for (var i = 0; i < modules.length; i++) {
            var checkbox = document.getElementById('checkbox' + i);
            var key = courseNumber + '_' + checkbox.id;
            data[key] = checkbox.checked;
        }
        // Convert the data to a JSON string
        var json = JSON.stringify(data);
        // Create a new Blob object using the JSON string
        var blob = new Blob([json], {type: 'application/json'});
        // Create a link to the Blob object
        var url = URL.createObjectURL(blob);
        // Create a link element, and click on it
        var link = document.createElement('a');
        link.href = url;
        link.download = 'checkbox_states.json';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Insert the import and export buttons into the header bar
    headerBar.appendChild(importButton);
    headerBar.appendChild(exportButton);

    // They renamed all the modules so the start of every title is identical, thus breaking my keys.
    // So here is a simple hash function to create a unique identifier from those strings
    function simpleHash(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    // Get the title text as a unique identifier from each module
    function getUniqueIdentifier(module) {
        // This will use a hash of the entire innerText of the module
        return simpleHash(module.querySelector('.title').innerText.trim()).toString();
    }

    // Okay, now the checkboxes
    for (var i = 0; i < modules.length; i++) {
        try {
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';

            var uniqueIdentifier = getUniqueIdentifier(modules[i]);
            checkbox.id = 'checkbox_' + uniqueIdentifier;

            var key = courseNumber + '_' + uniqueIdentifier;
            console.log('Getting value for key:', key); // Debug info
            if (GM_getValue(key)) {
                console.log('Checked:', key); // Debug info
                checkbox.checked = true;
            }

            checkbox.addEventListener('change', function() {
                var keyToSet = courseNumber + '_' + this.id.split('_')[1];
                console.log('Setting value for key:', keyToSet); // Debug info
                GM_setValue(keyToSet, this.checked);
            });

            modules[i].insertBefore(checkbox, modules[i].firstChild);

        } catch (e) {
            console.log("Item is locked; checkbox cannot be created. ", e); // Debug info
        }
    }
})();
