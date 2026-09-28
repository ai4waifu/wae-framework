import { provideWae } from '@wae/adapter-vue';
import { createClient } from '@wae/client';
import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

const client = createClient({ server: { baseUrl: '/api' } });
const app = createApp(App);
provideWae(app, client);
app.mount('#app');
