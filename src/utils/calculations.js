const VOL_FACTORS = {
  express: 5000,
  air:     6000,
  sea:     10000,
  default: 6000,
};

function calcVolumetricWeight(length, width, height, factor = VOL_FACTORS.default) {
  return (length * width * height) / factor;
}

function calcBillableWeight(realWeight, volWeight) {
  const billable = Math.max(realWeight, volWeight);
  return {
    billableWeight: Math.round(billable * 1000) / 1000,
    type: billable === realWeight ? 'real' : 'volumetrico',
    realWeight,
    volWeight: Math.round(volWeight * 1000) / 1000,
  };
}

function calcBrazilianTaxes(productValueUSD, freightUSD, usdToBrl = 5.0) {
  const totalUSD = productValueUSD + freightUSD;
  const totalBRL = totalUSD * usdToBrl;

  let ii_usd = 0;
  let regime  = 'remessa_conforme';

  if (productValueUSD <= 50) {
    ii_usd = 0;
    regime  = 'isento';
  } else if (productValueUSD <= 3000) {
    ii_usd = (productValueUSD - 50) * 0.20;
  } else {
    ii_usd  = productValueUSD * 0.60;
    regime  = 'regime_normal_estimativa';
  }

  const ii_brl        = ii_usd * usdToBrl;
  const icms_base_brl = (totalBRL + ii_brl) / (1 - 0.17);
  const icms_brl      = icms_base_brl * 0.17;
  const icms_usd      = icms_brl / usdToBrl;
  const iof_brl       = totalBRL * 0.0038;
  const iof_usd       = iof_brl / usdToBrl;

  const totalTaxesUSD = ii_usd + icms_usd + iof_usd;
  const totalTaxesBRL = ii_brl + icms_brl + iof_brl;

  return {
    regime,
    ii:    { usd: round2(ii_usd),    brl: round2(ii_brl) },
    icms:  { usd: round2(icms_usd),  brl: round2(icms_brl) },
    iof:   { usd: round2(iof_usd),   brl: round2(iof_brl) },
    total: { usd: round2(totalTaxesUSD), brl: round2(totalTaxesBRL) },
  };
}

function calcTotalCost(route, productValueUSD, weightG, length, width, height, usdToBrl = 5.0) {
  const weightKg   = weightG / 1000;
  const vol​​​​​​​​​​​​​​​​
