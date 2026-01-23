#!/bin/bash

echo "📺 Starting Floor Screens..."
cd screens

echo "📡 Starting USRP Emergency Receiver..."
node usrp-bridge.js &

echo "🖥️ Starting Screen UI..."
npm run dev
