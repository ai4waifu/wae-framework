import { mount } from 'svelte';
import App from './App.svelte';
import './styles.css';

const el = document.getElementById('app');
if (!el) throw new Error('#app missing');
mount(App, { target: el });
