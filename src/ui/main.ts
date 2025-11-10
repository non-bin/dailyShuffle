import * as t from '../lib/types';

// Edit
const editJobsContainer = document.getElementById('editJobs');
if (!editJobsContainer || !(editJobsContainer instanceof HTMLDivElement))
  throw TypeError('editJobsContainer element not found', { cause: editJobsContainer });

const editJobsDestination = document.getElementById('editJobsDestination');
if (!editJobsDestination || !(editJobsDestination instanceof HTMLSelectElement))
  throw TypeError('editJobsDestination element not found', { cause: editJobsDestination });

const editJobsSource = document.getElementById('editJobsSource');
if (!editJobsSource || !(editJobsSource instanceof HTMLSelectElement))
  throw TypeError('editJobsSource element not found', { cause: editJobsSource });

const editJobsSourceSearch = document.getElementById('editJobsSourceSearch');
if (!editJobsSourceSearch || !(editJobsSourceSearch instanceof HTMLButtonElement))
  throw TypeError('editJobsSourceSearch element not found', { cause: editJobsSourceSearch });

const editJobsSave = document.getElementById('editJobsSave');
if (!editJobsSave || !(editJobsSave instanceof HTMLButtonElement))
  throw TypeError('editJobsSave element not found', { cause: editJobsSave });

const editJobsDelete = document.getElementById('editJobsDelete');
if (!editJobsDelete || !(editJobsDelete instanceof HTMLButtonElement))
  throw TypeError('editJobsDelete element not found', { cause: editJobsDelete });

// New
const newJobContainer = document.getElementById('newJob');
if (!newJobContainer || !(newJobContainer instanceof HTMLDivElement))
  throw TypeError('newJobContainer element not found', { cause: newJobContainer });

const newJobSource = document.getElementById('newJobSource');
if (!newJobSource || !(newJobSource instanceof HTMLSelectElement))
  throw TypeError('newJobSource element not found', { cause: newJobSource });

const newJobSourceSearch = document.getElementById('newJobSourceSearch');
if (!newJobSourceSearch || !(newJobSourceSearch instanceof HTMLButtonElement))
  throw TypeError('newJobSourceSearch element not found', { cause: newJobSourceSearch });

const newJobDestinationName = document.getElementById('newJobDestinationName');
if (!newJobDestinationName || !(newJobDestinationName instanceof HTMLInputElement))
  throw TypeError('newJobDestinationName element not found', { cause: newJobDestinationName });

const newJobSave = document.getElementById('newJobSave');
if (!newJobSave || !(newJobSave instanceof HTMLButtonElement))
  throw TypeError('newJobSave element not found', { cause: newJobSave });

newJobDestinationName.value = '';

const jobs: t.JobWithNames[] = [];
let selectedJobId = 0;
let lastNewJobDestinationName = '';

fetch('./userJobs')
  .then((res) => {
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Not authenticated!', { cause: res });
      }
      throw new Error('Unknown error!', { cause: res });
    }

    return res.json();
  })
  .then((res) => {
    if (!Array.isArray(res)) {
      throw new Error('Response was not an array!', { cause: res });
    }

    for (const job of res) {
      if (t.isJobWithNames(job)) {
        jobs.push(job);

        const optionElement = document.createElement('option');
        optionElement.value = job.destinationPID;
        optionElement.innerText = job.destinationName;
        editJobsDestination.appendChild(optionElement);
      } else {
        console.error('Not a JobWithNames!', job); // TODO: report back to server
      }
    }

    const selectedJob = jobs[selectedJobId];
    if (selectedJob) {
      editJobsDestination.options.namedItem('placeholder')!.remove();
      editJobsDestination.disabled = false;
      editJobsDestination.value = selectedJob.destinationPID;

      const optionElement = document.createElement('option');
      optionElement.value = selectedJob.sourcePID;
      optionElement.innerText = selectedJob.sourceName;
      editJobsSource.appendChild(optionElement);
    } else editJobsDelete.disabled = true;

    editJobsSource.disabled = true;
    editJobsSave.disabled = true;
    newJobSource.disabled = true;
    newJobSave.disabled = true;

    const skeletons = document.getElementsByClassName('is-skeleton');
    while (skeletons.length > 0) {
      skeletons.item(0)?.classList.remove('is-skeleton');
    }
  });

const fetchPlaylists = () => {
  editJobsSource.parentElement!.classList.add('is-loading');
  newJobSource.parentElement!.classList.add('is-loading');

  fetch('./userPlaylists')
    .then((res) => {
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Not authenticated!', { cause: res });
        }
        throw new Error('Unknown error!', { cause: res });
      }

      return res.json();
    })
    .then((res) => {
      if (!Array.isArray(res)) {
        throw new Error('Response was not an array!', { cause: res });
      }

      editJobsSource.innerHTML = '';

      for (const playlist of res) {
        if (
          playlist &&
          typeof playlist === 'object' &&
          'name' in playlist &&
          typeof playlist.name === 'string' &&
          'id' in playlist &&
          typeof playlist.id === 'string'
        ) {
          const optionElement = document.createElement('option');
          optionElement.value = playlist.id;
          optionElement.innerText = playlist.name;
          newJobSource.appendChild(optionElement.cloneNode(true));
          editJobsSource.appendChild(optionElement);
        }
      }

      editJobsSource.value = jobs[selectedJobId]?.sourcePID || '';
      updateNewJobDestinationName(newJobSource.selectedOptions[0]?.innerText);

      newJobSource.disabled = false;
      newJobSave.disabled = false;
      newJobSave.title = '';

      if (jobs.length > 0) {
        editJobsSource.disabled = false;
        editJobsSave.disabled = false;
        editJobsSave.title = '';
      }

      editJobsSource.parentElement!.classList.remove('is-loading');
      newJobSource.parentElement!.classList.remove('is-loading');
    });
};

const updateNewJobDestinationName = (sourceName?: string) => {
  if (sourceName && (newJobDestinationName.value === '' || newJobDestinationName.value === lastNewJobDestinationName)) {
    lastNewJobDestinationName = `Daily Shuffle of ${sourceName}`;
    newJobDestinationName.value = lastNewJobDestinationName;
  }
};

editJobsSourceSearch.addEventListener('click', fetchPlaylists);
newJobSourceSearch.addEventListener('click', fetchPlaylists);

editJobsDestination.addEventListener('change', () => console.log('TODO'));
newJobSource.addEventListener('change', (e) => {
  if (e.target instanceof HTMLSelectElement) {
    updateNewJobDestinationName(e.target.selectedOptions[0]?.innerText);
    return;
  }
  throw new TypeError('Not a select element!', { cause: e });
});
