const express = require('express');
const router = express.Router();
const si = require('systeminformation');

router.get("/stats", (req, res) => {
  Promise.all([
    si.currentLoad(),
    si.mem(),
    si.networkStats(),
    si.fsSize(),
    si.graphics(),
    si.cpuTemperature(),
    si.cpu(),
    si.memLayout()
  ])
    .then(([cpuData, memData, netData, fsData, gpuData, tempData, cpuInfo, memLayout]) => {
      const ramUsed = Math.round((memData.active / (1024 * 1024 * 1024)) * 10) / 10;
      const ramTotal = Math.round((memData.total / (1024 * 1024 * 1024)) * 10) / 10;

      const commonSizes = [2, 4, 8, 16, 32, 64, 128];
      const ramTrueSize = commonSizes.find(size => size >= ramTotal) || Math.ceil(ramTotal);
      const ramType = memLayout[0] ? memLayout[0].type : "Unknown";

      const net = netData[0] || { rx_sec: 0, tx_sec: 0 };
      const downloadKBs = Math.round(net.rx_sec / 1024);
      const uploadKBs = Math.round(net.tx_sec / 1024);
      const disk = fsData.find(d => d.mount === '/') || { use: 0, size: 0, used: 0 };
      const diskUsePercent = Math.round(disk.use);
      const diskTotalGB = Math.round(disk.size / (1024 * 1024 * 1024));
      const diskFreeGB = Math.round((disk.size - disk.used) / (1024 * 1024 * 1024));

      const gpu = gpuData.controllers[0] || {};
      // const gpuLoad = Math.round(Math.random() * 100);
      const gpuLoad = gpu.utilizationGpu !== undefined ? Math.round(gpu.utilizationGpu) : null;
      const avgCoreTemp = tempData.cores.length > 0
        ? Math.round(tempData.cores.reduce((a, b) => a + b, 0) / tempData.cores.length)
        : null;

      res.json({
        cpu: Math.round(cpuData.currentLoad),
        ramUsed: ramUsed,
        ramTotal: ramTotal,
        ramTrueSize: ramTrueSize,
        ramType: ramType,
        download: downloadKBs,
        upload: uploadKBs,
        diskUse: diskUsePercent,
        diskTotalGB: diskTotalGB,
        diskFreeGB: diskFreeGB,
        gpuLoad: gpuLoad,
        cpuTemp: Math.round(tempData.main),
        cpuTempMax: Math.round(tempData.max),
        cpuTempAvgCores: avgCoreTemp,
        cpuModel: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
        gpuModel: gpu.model || "N/A"
      });
    })
  .catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  });
});

module.exports = router;
