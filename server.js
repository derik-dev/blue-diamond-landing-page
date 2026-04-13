const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1. Configuração do Google Calendar
// Você deve colocar o seu arquivo JSON de credenciais na mesma pasta como 'credentials.json'
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

// 2. Rota para a IA Criar Agendamentos
app.post('/api/schedule', async (req, res) => {
    try {
        const { summary, description, startDateTime, endDateTime, patientEmail } = req.body;

        const event = {
            'summary': `AGENDAMENTO: ${summary}`,
            'description': description,
            'start': {
                'dateTime': startDateTime, // Formato: '2026-05-28T09:00:00-03:00'
                'timeZone': 'America/Manaus',
            },
            'end': {
                'dateTime': endDateTime,
                'timeZone': 'America/Manaus',
            },
            'attendees': [{ 'email': patientEmail }],
            'reminders': {
                'useDefault': false,
                'overrides': [
                    { 'method': 'email', 'minutes': 24 * 60 },
                    { 'method': 'popup', 'minutes': 30 },
                ],
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary', // Substitua pelo ID da sua agenda se não for a principal
            resource: event,
        });

        res.status(200).json({ 
            success: true, 
            message: 'Agendamento realizado!', 
            link: response.data.htmlLink 
        });

    } catch (error) {
        console.error('Erro ao agendar:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor da Blue Diamond rodando na porta ${PORT}`);
    console.log(`📅 Pronto para integrar com o Google Calendar!`);
});
