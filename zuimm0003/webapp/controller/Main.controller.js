sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Label",
    "sap/m/ObjectStatus",
    "sap/m/Popover"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    DateFormat,
    MessageToast,
    MessageBox,
    Dialog,
    Button,
    Text,
    VBox,
    HBox,
    Label,
    ObjectStatus,
    Popover
) {
    "use strict";

    return Controller.extend("zuimm0003.controller.Main", {
        onInit: function () {
            this._oModel = this.getOwnerComponent().getModel();

            this.getView().setModel(new JSONModel({
                selectedKey: "ALL",
                counts: {
                    all: 0,
                    pr: 0,
                    stock: 0,
                    po: 0
                }
            }), "view");

            this._refreshCounts();
        },

        onSelectAlertTab: function (oEvent) {
            var sKey = oEvent.getParameter("key");

            this.getView().getModel("view").setProperty("/selectedKey", sKey);
            this._applyListFilter(sKey);
        },

        onAlertListUpdateFinished: function () {
            this._refreshCounts();
        },

        //=============================================================================
        // 버튼 기능
        //=============================================================================
        onPressRemind: function (oEvent) {
            this._completeAlert(oEvent.getSource().getBindingContext(), {
                successMessage: "결재자에게 독촉 알림이 전송되었습니다."
            });
        },
        onPressViewContact: function (oEvent) {
            var oButton = oEvent.getSource();
            var oView = this.getView();

            if (!this._pPopover) {
                this._pPopover = this.loadFragment({
                    name: "zuimm0003.view.fragments.ContactPopover"
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pPopover.then(function (oPopover) {
                // 클릭한 버튼의 데이터 컨텍스트를 팝업에 공유
                oPopover.setBindingContext(oButton.getBindingContext());
                // 버튼 위치를 기준으로 팝업 오픈
                oPopover.openBy(oButton);
            });

            this._oModel.read("/VendorSet('" + oButton.getBindingContext().getObject().RefDoc + "')", {
                success: function (oData) {
                    this.getView().setModel(new JSONModel(oData), "vendor");
                }.bind(this),
                error: function (oError) {
                    console.log("oData 요청 실패", oError);
                }.bind(this)
            });
        },
        onPressNoRemind: function (oEvent) {
            var sPath = oEvent.getSource().getBindingContext().getPath();

            // this._oModel.setUseBatch(false);

            this._oModel.update(sPath, {
                ZaStatus: "Y"
            }, {
                success: function () {
                    MessageToast.show("알림이 처리되었습니다.");
                    this._refreshList();
                    this._refreshCounts();
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(oError);
                }
            });
        },

        _applyListFilter: function (sKey) {
            var oBinding = this.byId("alertFeedList").getBinding("items");
            var aFilters = [];

            // 탭 선택 시 데이터의 실제 필드값(PR, ST, PO) 기준으로 필터링하도록 수정
            if (sKey === "PR") {
                aFilters.push(new Filter("AlertType", FilterOperator.EQ, "PR"));
            } else if (sKey === "STOCK") {
                aFilters.push(new Filter("AlertType", FilterOperator.EQ, "ST"));
            } else if (sKey === "PO") {
                aFilters.push(new Filter("AlertType", FilterOperator.EQ, "PO"));
            }

            if (oBinding) {
                oBinding.filter(aFilters);
            }
        },

        _completeAlert: function (oContext, mOptions) {
            var oModel = this.getOwnerComponent().getModel();
            var oAlert = oContext.getObject();
            var sPath = oContext.getPath();

            mOptions = mOptions || {};

            oModel.update(sPath, {
                AlertId: oAlert.AlertId,
                AlertType: oAlert.AlertType,
                Criticality: oAlert.Criticality,
                Message: oAlert.Message,
                RefDoc: oAlert.RefDoc,
                ZaStatus: "Y"
            }, {
                merge: true,
                success: function () {
                    MessageToast.show(mOptions.successMessage || "알림이 처리되었습니다.");

                    if (typeof mOptions.success === "function") {
                        mOptions.success();
                    }

                    this._refreshList();
                    this._refreshCounts();
                }.bind(this),
                error: function (oError) {
                    if (typeof mOptions.error === "function") {
                        mOptions.error(oError);
                    }

                    MessageBox.error(this._getErrorMessage(oError));
                }.bind(this)
            });
        },

        _refreshList: function () {
            var oBinding = this.byId("alertFeedList").getBinding("items");
            var sKey = this.getView().getModel("view").getProperty("/selectedKey");

            if (oBinding) {
                this._applyListFilter(sKey);
                oBinding.refresh(true);
            }
        },

        _refreshCounts: function () {
            this._readCount("all");
            this._readCount("pr", "PR");
            this._readCount("stock", "ST");
            this._readCount("po", "PO");
        },

        _readCount: function (sProperty, sType) {
            var oModel = this.getOwnerComponent().getModel();
            var aFilters = [];

            if (!oModel) {
                return;
            }

            if (sProperty !== "all") {
                aFilters.push(new Filter("AlertType", FilterOperator.EQ, sType));
            }

            oModel.read("/AlertSet/$count", {
                filters: aFilters,
                success: function (sCount) {
                    this.getView().getModel("view").setProperty("/counts/" + sProperty, Number(sCount));
                }.bind(this),
                error: function () {
                    this.getView().getModel("view").setProperty("/counts/" + sProperty, 0);
                }.bind(this)
            });
        },

        _getDeficitText: function (oAlert) {
            var aNumbers = String(oAlert.Message || "").match(/\d+([.,]\d+)?/g);

            if (oAlert.Menge) {
                return [oAlert.Menge, oAlert.Meins].filter(Boolean).join(" ");
            }

            if (aNumbers && aNumbers.length) {
                return aNumbers[aNumbers.length - 1] + " EA";
            }

            return "백엔드 자동 계산";
        },

        _normalizeType: function (sType) {
            var sNormalized = String(sType || "").toUpperCase();

            if (sNormalized === "ST" || sNormalized === "S") {
                return "STOCK";
            }

            return sNormalized;
        },

        _getErrorMessage: function (oError) {
            var sDefault = "알림 처리 중 오류가 발생했습니다.";

            try {
                return JSON.parse(oError.responseText).error.message.value || sDefault;
            } catch (e) {
                return sDefault;
            }
        },

        formatCategoryText: function (sType) {
            switch (this._normalizeType(sType)) {
                case "PR":
                    return "[구매요청 결재 지연]";
                case "STOCK":
                    return "[안전재고 부족]";
                case "PO":
                    return "[PO 납품 지연]";
                default:
                    return "[구매 알림]";
            }
        },

        formatCategoryIcon: function (sType) {
            switch (this._normalizeType(sType)) {
                case "PR":
                    return "sap-icon://pending";
                case "STOCK":
                    return "sap-icon://alert";
                case "PO":
                    return "sap-icon://shipping-status";
                default:
                    return "sap-icon://notification-2";
            }
        },

        formatCategoryColorScheme: function (sAlertType) {
            switch (sAlertType) {
                case "PR":
                    return "Accent3";     // 연한 붉은색 계열 (결재 지연)
                case "ST":
                    return "Accent1";  // 연한 주황/옐로우 계열 (재고 부족)
                case "PO":
                    return "Accent10";     // 연한 회색/블루 계열 (납품 지연)
                default:
                    return "Accent6";
            }
        },

        formatInfo: function (sRefDoc, sAlertId) {
            return sRefDoc || sAlertId || "";
        },

        formatTimestamp: function (vDate, vTime) {
            var oDate;
            var iMs;

            if (!vDate) {
                return "";
            }

            oDate = vDate instanceof Date ? new Date(vDate.getTime()) : new Date(vDate);
            iMs = vTime && typeof vTime.ms === "number" ? vTime.ms : 0;
            oDate.setMilliseconds(oDate.getMilliseconds() + iMs);

            return DateFormat.getDateTimeInstance({
                pattern: "yyyy.MM.dd HH:mm"
            }).format(oDate);
        },

        isPRAlert: function (sType) {
            return this._normalizeType(sType) === "PR";
        },

        isStockAlert: function (sType) {
            return this._normalizeType(sType) === "STOCK";
        },

        isPOAlert: function (sType) {
            return this._normalizeType(sType) === "PO";
        }
    });
});
