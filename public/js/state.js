// Shared mutable app state — one plain object, imported everywhere.
export const store = {
  userLL: null,          // {lat,lng} from GPS
  isTracking: false,
  watchId: null,
  travelMode: 'driving',
  voiceEnabled: false,
  routeSteps: [],
  activeStep: -1,
  selFrom: null,         // {lat,lng,name}
  selTo: null,
  satOn: false,
  darkOn: false,
  reportsOn: true,
  bsOpen: false,
  user: null,            // signed-in user
  currentPlaces: [],
  currentTrotro: null,   // station for modal nav
  reportingType: null,   // report type waiting for a map click
  pendingSave: null,     // {lat,lng,name} for the save-place modal
};
