(function () {
  "use strict";

  const models = [
    {
      key: "baseline",
      name: "Baseline",
      accuracy: 0.7486,
      precision: 0.7782,
      recall: 0.6415,
      f1: 0.7033,
      macroF1: 0.7426,
      fprDisparity: 0.4211,
      dpDiff: 0.5054,
      cftGap: 0.0521
    },
    {
      key: "cda",
      name: "CDA",
      accuracy: 0.7341,
      precision: 0.7606,
      recall: 0.6237,
      f1: 0.6853,
      macroF1: 0.7275,
      fprDisparity: 0.1956,
      dpDiff: 0.1359,
      cftGap: 0.0424
    },
    {
      key: "adversarial",
      name: "Adversarial",
      accuracy: 0.7473,
      precision: 0.7811,
      recall: 0.6332,
      f1: 0.6994,
      macroF1: 0.7407,
      fprDisparity: 0.2561,
      dpDiff: 0.2935,
      cftGap: 0.0684
    }
  ];

  const groupFpr = {
    caste: { Baseline: 0.4211, CDA: 0.3421, Adversarial: 0.3947 },
    gender: { Baseline: 0.1505, CDA: 0.1465, Adversarial: 0.1386 },
    region: { Baseline: 0.0, CDA: 0.1667, Adversarial: 0.1667 },
    religion: { Baseline: 0.2825, CDA: 0.2825, Adversarial: 0.2486 }
  };

  const metrics = [
    { label: "FPR Disparity", key: "fprDisparity" },
    { label: "DP Gap", key: "dpDiff" },
    { label: "CFT Gap", key: "cftGap" }
  ];

  function percentChange(after, before) {
    return ((after - before) / before) * 100;
  }

  function signedPercent(value) {
    const rounded = Math.round(value);
    return (rounded > 0 ? "+" : "") + rounded + "%";
  }

  function format(value) {
    return value.toFixed(3);
  }

  function modelByName(name) {
    return models.find(function (model) {
      return model.name === name;
    });
  }

  function renderScoreRows() {
    const body = document.getElementById("scoreRows");
    if (!body) return;

    body.innerHTML = models
      .map(function (model) {
        const best = model.key === "cda" ? " class=\"best-row\"" : "";
        return [
          "<tr" + best + ">",
          "<td><span class=\"model-pill " + model.key + "\">" + model.name + "</span></td>",
          "<td>" + format(model.f1) + "</td>",
          "<td>" + format(model.fprDisparity) + "</td>",
          "<td>" + format(model.dpDiff) + "</td>",
          "<td>" + format(model.cftGap) + "</td>",
          "</tr>"
        ].join("");
      })
      .join("");
  }

  function renderGains() {
    const baseline = modelByName("Baseline");
    const cda = modelByName("CDA");
    const adv = modelByName("Adversarial");
    if (!baseline || !cda || !adv) return;

    const fpr = document.getElementById("fprGain");
    const dp = document.getElementById("dpGain");
    const advCft = document.getElementById("advCftGain");

    if (fpr) fpr.textContent = signedPercent(percentChange(cda.fprDisparity, baseline.fprDisparity));
    if (dp) dp.textContent = signedPercent(percentChange(cda.dpDiff, baseline.dpDiff));
    if (advCft) advCft.textContent = signedPercent(percentChange(adv.cftGap, baseline.cftGap));
  }

  function renderFairnessChart() {
    const chart = document.getElementById("fairnessChart");
    if (!chart) return;

    const max = Math.max.apply(
      null,
      metrics.flatMap(function (metric) {
        return models.map(function (model) {
          return model[metric.key];
        });
      })
    );

    chart.innerHTML = metrics
      .map(function (metric) {
        const rows = models
          .map(function (model) {
            const width = Math.max(3, (model[metric.key] / max) * 100);
            return [
              "<div class=\"bar-row\">",
              "<span class=\"bar-label\">" + model.name + "</span>",
              "<div class=\"bar-track\">",
              "<div class=\"bar-fill " + model.key + "\" style=\"width: " + width.toFixed(1) + "%\"></div>",
              "</div>",
              "<span class=\"bar-value\">" + format(model[metric.key]) + "</span>",
              "</div>"
            ].join("");
          })
          .join("");

        return [
          "<div class=\"metric-group\">",
          "<div class=\"metric-name\">" + metric.label + "</div>",
          "<div class=\"bar-stack\">" + rows + "</div>",
          "</div>"
        ].join("");
      })
      .join("");
  }

  function renderGroupFprChart() {
    const chart = document.getElementById("groupFprChart");
    if (!chart) return;

    const groups = ["religion", "caste", "gender", "region"];
    const headers = ["Baseline", "CDA", "Adversarial"];
    const max = 0.45;

    const head = ["<div></div>"]
      .concat(
        headers.map(function (header) {
          return "<div class=\"group-head\">" + header + "</div>";
        })
      )
      .join("");

    const rows = groups
      .map(function (group) {
        const label = group.charAt(0).toUpperCase() + group.slice(1);
        const cells = headers
          .map(function (modelName) {
            const value = groupFpr[group][modelName];
            const model = modelByName(modelName);
            const height = Math.max(4, (value / max) * 100);
            return [
              "<div class=\"group-cell " + model.key + "\">",
              "<i style=\"--h: " + height.toFixed(1) + "%\"></i>",
              "<span>" + format(value) + "</span>",
              "</div>"
            ].join("");
          })
          .join("");
        return "<div class=\"group-name\">" + label + "</div>" + cells;
      })
      .join("");

    chart.innerHTML = head + rows;
  }

  function renderTradeoffChart() {
    const chart = document.getElementById("tradeoffChart");
    if (!chart) return;

    const f1Min = 0.68;
    const f1Max = 0.71;
    const fprMin = 0.16;
    const fprMax = 0.44;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    const points = models
      .map(function (model) {
        const x = ((model.f1 - f1Min) / (f1Max - f1Min)) * 82 + 9;
        const y = 91 - ((model.fprDisparity - fprMin) / (fprMax - fprMin)) * 82;
        return [
          "<div class=\"point " + model.key + "\" style=\"left: " + clamp(x, 7, 93).toFixed(1) + "%; top: " + clamp(y, 8, 88).toFixed(1) + "%\">",
          "<span class=\"point-dot\"></span>",
          "<span class=\"point-label\">" + model.name + "</span>",
          "</div>"
        ].join("");
      })
      .join("");

    chart.innerHTML = [
      "<span class=\"axis-label y\">Lower FPR Disparity</span>",
      "<span class=\"axis-label x\">Higher F1</span>",
      points
    ].join("");
  }

  function revealOnScroll() {
    const targets = document.querySelectorAll(".slide, .pipeline-node, .takeaway-card, .chart-panel");
    targets.forEach(function (target) {
      target.style.opacity = "0";
      target.style.transform = "translateY(16px)";
      target.style.transition = "opacity 0.55s ease, transform 0.55s ease";
    });

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (target) {
        target.style.opacity = "1";
        target.style.transform = "none";
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "none";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach(function (target) {
      observer.observe(target);
    });
  }

  renderScoreRows();
  renderGains();
  renderFairnessChart();
  renderGroupFprChart();
  renderTradeoffChart();
  revealOnScroll();
})();
