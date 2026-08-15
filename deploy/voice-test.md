# Voice Task API Test (GLM + Aliyun NLS)

This guide documents a minimal end-to-end test for the voice-to-task flow.
It assumes the backend runs locally and reads `backend/.env`.

## Prerequisites
- `backend/.env` configured with:
  - `GLM_API_KEY`
  - `ALIYUN_NLS_APPKEY`
  - Either `ALIYUN_NLS_TOKEN` or (`ALIYUN_ACCESS_KEY_ID` + `ALIYUN_ACCESS_KEY_SECRET`)
- Python venv + dependencies installed:
  - `python3 -m venv backend/venv`
  - `backend/venv/bin/pip install -r backend/requirements.txt`

## 1) Start the API
```bash
cd backend
./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## 2) Create a test user
```bash
curl -s -X POST 'http://127.0.0.1:8000/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{"email":"voice-test@example.com","password":"123456"}'
```

## 3) Login to get a token
```bash
curl -s -X POST 'http://127.0.0.1:8000/api/auth/login' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=voice-test@example.com&password=123456&grant_type=password'
```

Copy the `access_token` from the response.

## 4) Prepare an audio file
### macOS quick synth
```bash
say -o /tmp/voice.aiff "明天下午三点开会"
afconvert -f WAVE -d LEI16@16000 /tmp/voice.aiff /tmp/voice.wav
```

### Or use your own file
Supported formats include: `wav`, `pcm`, `mp3`, `ogg` (recommended: `wav` or `ogg`).

## 5) Call the voice API
```bash
curl -s -X POST 'http://127.0.0.1:8000/api/voice/tasks' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -F 'audio=@/tmp/voice.wav;type=audio/wav'
```

Expected response:
- `transcript`: recognized text
- `task`: created task data

## Notes
- The task will be persisted to `backend/planner.db` (SQLite default).
- If you use OGG/OPUS from browsers, ensure sample rate is 48000 or set
  `ALIYUN_NLS_SAMPLE_RATE=0` to auto-detect.
