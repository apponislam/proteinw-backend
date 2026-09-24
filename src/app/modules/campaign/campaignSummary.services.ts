import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { CampaignModel } from "./campaign.model";
import { OrderModel } from "../order/order.model";
import { TierModel } from "../tier/tier.model";

export const generateOrderSummaryHtml = async (campaignId: string): Promise<string> => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false })
        .populate("groupId", "name")
        .populate("createdBy", "name email");

    if (!campaign) {
        throw new ApiError(httpStatus.NOT_FOUND, "Begärd försäljning hittades inte eller har raderats.");
    }

    const campaignObjId = new Types.ObjectId(campaignId);

    // Fetch all active orders strictly for this campaign
    const orders = await OrderModel.find({
        campaignId: campaignObjId,
        isDeleted: false,
    }).populate("memberId", "name email");

    // Fetch tiers to determine active tier percentage
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    // Aggregate Product Totals & Seller Totals
    let totalProductsSold = 0;
    let totalSalesRevenue = 0;

    const productMap: Record<string, number> = {};
    const sellerMap: Record<string, { name: string; totalProducts: number; totalSales: number; products: Record<string, number> }> = {};

    for (const order of orders) {
        totalProductsSold += order.totalPackage || 0;
        totalSalesRevenue += order.totalPrice || 0;

        const sellerId = order.memberId ? (order.memberId as any)._id?.toString() || order.memberId.toString() : "unknown";
        const sellerName = order.memberId ? (order.memberId as any).name || "Okänd säljare" : "Direktköp / Ingen säljare";

        if (!sellerMap[sellerId]) {
            sellerMap[sellerId] = {
                name: sellerName,
                totalProducts: 0,
                totalSales: 0,
                products: {},
            };
        }

        sellerMap[sellerId].totalProducts += order.totalPackage || 0;
        sellerMap[sellerId].totalSales += order.totalPrice || 0;

        for (const item of order.items) {
            const pName = item.productName || "Produkt";
            const qty = item.quantity || 0;

            productMap[pName] = (productMap[pName] || 0) + qty;
            sellerMap[sellerId].products[pName] = (sellerMap[sellerId].products[pName] || 0) + qty;
        }
    }

    // Determine Tier percentage
    let currentTier = null;
    if (campaign.tierId) {
        currentTier = tiers.find((t) => t._id.toString() === campaign.tierId?.toString()) || null;
    }
    if (!currentTier) {
        currentTier = tiers.find((t) => totalProductsSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || totalProductsSold <= t.maxSalesVolume)) || null;
    }

    const profitPercentage = currentTier?.percentage || 0;
    const totalProfit = Math.round(totalSalesRevenue * (profitPercentage / 100));

    // Build Product Rows
    const productRowsHtml = Object.entries(productMap)
        .map(
            ([pName, qty]) => `
                <tr>
                    <td>${pName}</td>
                    <td style="text-align: right;"><strong>${qty}</strong></td>
                </tr>`,
        )
        .join("");

    // Build Seller Cards
    const sellerCardsHtml = Object.values(sellerMap)
        .map((seller) => {
            const productChips = Object.entries(seller.products)
                .map(([pName, qty]) => `<span class="chip">${pName} × <strong>${qty}</strong></span>`)
                .join("");

            return `
            <div class="seller-item">
                <div class="seller-head">
                    <span class="seller-name">${seller.name}</span>
                    <div class="seller-stats">
                        <span>Total products: <strong>${seller.totalProducts}</strong></span>
                        <span>Total sales: <strong>${seller.totalSales.toLocaleString("sv-SE")} SEK</strong></span>
                    </div>
                </div>
                <div class="seller-body">
                    <div class="product-chips">
                        ${productChips || '<span class="chip">Inga produkter sålda</span>'}
                    </div>
                </div>
            </div>`;
        })
        .join("");

    const groupName = (campaign.groupId as any)?.name || "Grupp saknas";
    const adminName = (campaign.createdBy as any)?.name || "Admin saknas";

    const formattedDate = new Date().toISOString().split("T")[0];

    return `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Summary - ${campaign.name}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        html, body {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            font-size: 12px;
            line-height: 1.4;
        }

        .pdf-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 18mm 18mm 18mm 18mm !important;
            box-sizing: border-box;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 20px;
        }

        .brand-title {
            font-size: 22px;
            font-weight: 800;
            color: #7c5800;
            letter-spacing: -0.3px;
            margin: 0;
            line-height: 1;
        }

        .brand-subtitle {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
        }

        .doc-name {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
            text-align: right;
        }

        .doc-meta {
            font-size: 11px;
            color: #64748b;
            text-align: right;
            margin-top: 3px;
        }

        .meta-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 22px;
        }

        .meta-field {
            display: flex;
            flex-direction: column;
        }

        .meta-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }

        .meta-val {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
        }

        .section-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0f172a;
            padding-bottom: 6px;
            border-bottom: 1.5px solid #0f172a;
            margin-top: 22px;
            margin-bottom: 12px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 18px;
        }

        .summary-box {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 12px;
        }

        .summary-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 4px;
        }

        .summary-value {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
        }

        .summary-value.brand {
            color: #7c5800;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 22px;
        }

        .table th {
            background: #f1f5f9;
            color: #0f172a;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 12px;
            text-align: left;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
        }

        .table td {
            padding: 8px 12px;
            font-size: 12px;
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
        }

        .table tr:nth-child(even) td {
            background-color: #f8fafc;
        }

        .seller-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .seller-item {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            page-break-inside: avoid;
        }

        .seller-head {
            background: #f8fafc;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
        }

        .seller-name {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
        }

        .seller-stats {
            font-size: 11px;
            color: #475569;
            display: flex;
            gap: 16px;
        }

        .seller-body {
            padding: 8px 12px;
        }

        .product-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .chip {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            color: #334155;
        }

        .chip strong {
            color: #0f172a;
        }

        @media print {
            @page {
                size: A4 portrait;
                margin: 0;
            }
            body {
                background: #ffffff;
            }
            .pdf-page {
                padding: 18mm !important;
            }
            .seller-item {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>

    <div class="pdf-page">
        <div class="header">
            <div>
                <h1 class="brand-title">KUNGSBJÖRNEN</h1>
                <div class="brand-subtitle">Order & Warehouse Summary</div>
            </div>
            <div>
                <div class="doc-name">Order Summary</div>
                <div class="doc-meta">Generated: ${formattedDate}</div>
            </div>
        </div>

        <div class="meta-container">
            <div class="meta-field">
                <span class="meta-label">Group Name</span>
                <span class="meta-val">${groupName}</span>
            </div>
            <div class="meta-field">
                <span class="meta-label">Campaign Name</span>
                <span class="meta-val">${campaign.name}</span>
            </div>
            <div class="meta-field">
                <span class="meta-label">Admin Name</span>
                <span class="meta-val">${adminName}</span>
            </div>
        </div>

        <div class="section-title">Total Summary</div>

        <div class="summary-grid">
            <div class="summary-box">
                <div class="summary-label">Total Products Sold</div>
                <div class="summary-value">${totalProductsSold}</div>
            </div>
            <div class="summary-box">
                <div class="summary-label">Tier Level (Förtjänstnivå)</div>
                <div class="summary-value brand">${profitPercentage}%</div>
            </div>
            <div class="summary-box">
                <div class="summary-label">Total Profit</div>
                <div class="summary-value brand">${totalProfit.toLocaleString("sv-SE")} SEK</div>
            </div>
            <div class="summary-box">
                <div class="summary-label">Total Sales</div>
                <div class="summary-value">${totalSalesRevenue.toLocaleString("sv-SE")} SEK</div>
            </div>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th style="text-align: right; width: 120px;">Quantity</th>
                </tr>
            </thead>
            <tbody>
                ${productRowsHtml || '<tr><td colspan="2">Inga produkter sålda ännu</td></tr>'}
            </tbody>
        </table>

        <div class="section-title">Per Seller</div>

        <div class="seller-list">
            ${sellerCardsHtml || '<div style="padding: 12px; color: #64748b;">Inga säljare med registrerade ordrar ännu.</div>'}
        </div>
    </div>

</body>
</html>`;
};

export const campaignSummaryServices = {
    generateOrderSummaryHtml,
};
