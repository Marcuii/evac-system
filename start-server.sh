#!/bin/bash

echo "�️ Starting MongoDB service..."
sudo systemctl start mongod

echo "�🚀 Starting Backend Server..."
cd server && npm start
