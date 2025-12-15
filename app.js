let mobileToggle = document.querySelector(".mobile-toggle");
let mobileMenu = document.querySelector(".mobile-menu");
let selectorSource = document.querySelectorAll(".selector-source p");
let selectorTarget = document.querySelectorAll(".selector-target p");
let rateSource = document.querySelector(".rate-source");
let rateTarget = document.querySelector(".rate-target");
let amountSource = document.querySelector(".amount-source");
let amountTarget = document.querySelector(".amount-target");
let recentSide;
const ACCESS_KEY = "7b83f04bbf434bfe5e9da4b9f0c98047";
let queuedExchange = null;

const offlineMsg = document.querySelector(".offline-message");
const onlineMsg = document.querySelector(".online-message");

window.addEventListener("offline", function () {
  offlineMsg.style.display = "block";
  onlineMsg.style.display = "none";
});

window.addEventListener("online", function () {
  offlineMsg.style.display = "none";
  onlineMsg.style.display = "block";
  setTimeout(function () {
    onlineMsg.style.display = "none";
  }, 3000);

  if (queuedExchange) {
    const { side, value, from, to } = queuedExchange;
    performExchange(from, to, value).then((data) => {
      if (side === "source") {
        amountTarget.value = sanitizeValue(String(data));
      } else {
        amountSource.value = sanitizeValue(String(data));
      }
      queuedExchange = null;
    });
  }
});

function performExchange(from, to, amount) {
  return fetch(
    `https://api.exchangerate.host/convert?access_key=${ACCESS_KEY}&from=${from}&to=${to}&amount=${amount}`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        return data.result;
      } else {
        console.error("Conversion error:", data);
        return "error";
      }
    })
    .catch((error) => {
      console.error("API error:", error);
      return "error";
    });
}

function sanitizeValue(value) {
  value = value.replace(/\s/g, "");
  value = value.replace(/[^0-9.,]/g, "");
  value = value.replace(/,/g, ".");
  value = validateDot(value);
  if (value.startsWith(".")) {
    value = "0" + value;
  }
  const parts = value.split(".");
  if (parts.length === 2) {
    parts[1] = parts[1].slice(0, 5);
    value = parts[0] + "." + parts[1];
  }
  return value;
}

function validateDot(value) {
  let firstDot = value.indexOf(".");
  if (firstDot >= 0) {
    return (
      value.slice(0, firstDot + 1) +
      value.slice(firstDot + 1).replace(/\./g, "")
    );
  }
  return value;
}

mobileToggle.addEventListener("click", () => {
  if (mobileMenu.style.display == "none") {
    mobileMenu.style.display = "block";
  } else {
    mobileMenu.style.display = "none";
  }
});

selectorSource.forEach((item) => {
  item.addEventListener("click", () => {
    selectorSource.forEach((btn) => btn.classList.remove("selected-currency"));
    item.classList.add("selected-currency");
    const fromCurrency = document.querySelector(
      ".selector-source .selected-currency"
    ).textContent;
    const toCurrency = document.querySelector(
      ".selector-target .selected-currency"
    ).textContent;
    refreshRates(fromCurrency, toCurrency);
  });
});

selectorTarget.forEach((item) => {
  item.addEventListener("click", () => {
    selectorTarget.forEach((btn) => btn.classList.remove("selected-currency"));
    item.classList.add("selected-currency");
    const fromCurrency = document.querySelector(
      ".selector-source .selected-currency"
    ).textContent;
    const toCurrency = document.querySelector(
      ".selector-target .selected-currency"
    ).textContent;
    refreshRates(fromCurrency, toCurrency);
  });
});

function refreshRates(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    rateSource.textContent = `1 ${fromCurrency} = 1 ${toCurrency}`;
    rateTarget.textContent = `1 ${toCurrency} = 1 ${fromCurrency}`;
    if (recentSide === "source") {
      amountTarget.value = amountSource.value;
    } else {
      amountSource.value = amountTarget.value;
    }
  } else {
    fetch(
      `https://api.exchangerate.host/live?access_key=${ACCESS_KEY}&source=${fromCurrency}&currencies=${toCurrency}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const currencyPair = fromCurrency + toCurrency;
          const exchangeRateSource = data.quotes[currencyPair];
          if (exchangeRateSource) {
            rateSource.textContent = `1 ${fromCurrency} = ${exchangeRateSource.toFixed(
              5
            )} ${toCurrency}`;
            if (recentSide === "source") {
              amountTarget.value = sanitizeValue(
                (parseFloat(amountSource.value) * exchangeRateSource).toFixed(5)
              );
            }
          } else {
            rateSource.textContent = "Error fetching rate";
          }
        } else {
          rateSource.textContent = "Error fetching rate";
        }
      })
      .catch(() => (rateSource.textContent = "Error fetching rate"));

    fetch(
      `https://api.exchangerate.host/live?access_key=${ACCESS_KEY}&source=${toCurrency}&currencies=${fromCurrency}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const currencyPair = toCurrency + fromCurrency;
          const exchangeRateTarget = data.quotes[currencyPair];
          if (exchangeRateTarget) {
            rateTarget.textContent = `1 ${toCurrency} = ${exchangeRateTarget.toFixed(
              5
            )} ${fromCurrency}`;
            if (recentSide === "target") {
              amountSource.value = sanitizeValue(
                (parseFloat(amountTarget.value) * exchangeRateTarget).toFixed(5)
              );
            }
          } else {
            rateTarget.textContent = "Error fetching rate";
          }
        } else {
          rateTarget.textContent = "Error fetching rate";
        }
      })
      .catch(() => (rateTarget.textContent = "Error fetching rate"));
  }
}

amountSource.addEventListener("input", () => {
  amountSource.value = sanitizeValue(amountSource.value);
  recentSide = "source";

  const fromCurrency = document.querySelector(
    ".selector-source .selected-currency"
  ).textContent;
  const toCurrency = document.querySelector(
    ".selector-target .selected-currency"
  ).textContent;

  if (!navigator.onLine) {
    if (fromCurrency === toCurrency) {
      amountTarget.value = amountSource.value;
    } else {
      amountTarget.value = "";
      queuedExchange = {
        side: "source",
        value: amountSource.value,
        from: fromCurrency,
        to: toCurrency,
      };
      return;
    }
  }

  if (fromCurrency === toCurrency) {
    amountTarget.value = amountSource.value;
    refreshRates(fromCurrency, toCurrency);
  } else {
    performExchange(fromCurrency, toCurrency, amountSource.value).then(
      (data) => {
        amountTarget.value = sanitizeValue(String(data));
      }
    );
  }
});

amountTarget.addEventListener("input", () => {
  amountTarget.value = sanitizeValue(amountTarget.value);
  recentSide = "target";

  const fromCurrency = document.querySelector(
    ".selector-target .selected-currency"
  ).textContent;
  const toCurrency = document.querySelector(
    ".selector-source .selected-currency"
  ).textContent;

  if (!navigator.onLine) {
    if (fromCurrency === toCurrency) {
      amountSource.value = amountTarget.value;
    } else {
      amountSource.value = "";
      queuedExchange = {
        side: "target",
        value: amountTarget.value,
        from: fromCurrency,
        to: toCurrency,
      };
      return;
    }
  }

  if (fromCurrency === toCurrency) {
    amountSource.value = amountTarget.value;
    refreshRates(fromCurrency, toCurrency);
  } else {
    performExchange(fromCurrency, toCurrency, amountTarget.value).then(
      (data) => {
        amountSource.value = sanitizeValue(String(data));
      }
    );
  }
});
