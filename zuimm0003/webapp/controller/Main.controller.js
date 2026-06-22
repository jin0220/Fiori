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

        onPressRemind: function (oEvent) {
            this._completeAlert(oEvent.getSource().getBindingContext(), {
                successMessage: "결재자에게 독촉 알림이 전송되었습니다."
            });
        },

        onPressCreatePR: function (oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();
            var oAlert = oContext.getObject();
            var sQuantity = this._getDeficitText(oAlert);
            var oDialog = new Dialog({
                title: "즉시 PR 생성",
                contentWidth: "28rem",
                draggable: true,
                resizable: true,
                content: new VBox({
                    class: "zuimmActionDialog",
                    items: [
                        new Text({
                            text: "안전재고 부족분을 기준으로 구매요청을 생성합니다."
                        }),
                        this._createDialogRow("알림 번호", oAlert.AlertId || "-"),
                        this._createDialogRow("참조 문서", oAlert.RefDoc || "-"),
                        this._createDialogRow("부족 수량", sQuantity)
                    ]
                }),
                beginButton: new Button({
                    text: "승인",
                    type: "Accept",
                    icon: "sap-icon://accept",
                    press: function () {
                        oDialog.setBusy(true);
                        this._completeAlert(oContext, {
                            successMessage: "구매요청이 생성되었습니다.",
                            success: function () {
                                oDialog.close();
                            },
                            error: function () {
                                oDialog.setBusy(false);
                            }
                        });
                    }.bind(this)
                }),
                endButton: new Button({
                    text: "취소",
                    press: function () {
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            this.getView().addDependent(oDialog);
            oDialog.open();
        },

        onPressViewContact: function (oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();
            var oAlert = oContext.getObject();
            var oPopover = new Popover({
                title: "업체 연락처",
                placement: "Auto",
                contentWidth: "22rem",
                content: new VBox({
                    class: "zuimmContactCard",
                    items: [
                        new ObjectStatus({
                            title: "납품 지연",
                            text: oAlert.RefDoc || "-",
                            state: "Information",
                            icon: "sap-icon://shipping-status"
                        }),
                        this._createContactLine("담당자", "김민준 구매 담당"),
                        this._createContactLine("전화", "02-1234-5678"),
                        this._createContactLine("이메일", "vendor.contact@example.com")
                    ]
                }),
                footer: new HBox({
                    width: "100%",
                    justifyContent: "End",
                    class: "zuimmPopoverFooter",
                    items: [
                        new Button({
                            text: "처리 완료",
                            type: "Emphasized",
                            icon: "sap-icon://complete",
                            press: function () {
                                this._completeAlert(oContext, {
                                    successMessage: "PO 납품 지연 알림이 처리되었습니다.",
                                    success: function () {
                                        oPopover.close();
                                    }
                                });
                            }.bind(this)
                        })
                    ]
                }),
                afterClose: function () {
                    oPopover.destroy();
                }
            });

            this.getView().addDependent(oPopover);
            oPopover.openBy(oButton);
        },

        _applyListFilter: function (sKey) {
            var oBinding = this.byId("alertFeedList").getBinding("items");
            var aFilters = [
                new Filter("ZaStatus", FilterOperator.EQ, "N")
            ];

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
            var aFilters = [
                new Filter("ZaStatus", FilterOperator.EQ, "N")
            ];

            if (!oModel) {
                return;
            }

            aFilters.push(new Filter("AlertType", FilterOperator.EQ, sType));
            console.log(aFilters);
            oModel.read("/AlertSet/$count", {
                filters: aFilters,
                success: function (sCount) {
                    console.log(sCount);
                    this.getView().getModel("view").setProperty("/counts/" + sProperty, Number(sCount));
                }.bind(this),
                error: function () {
                    this.getView().getModel("view").setProperty("/counts/" + sProperty, 0);
                }.bind(this)
            });
        },

        _createDialogRow: function (sLabel, sValue) {
            return new HBox({
                class: "zuimmDialogRow",
                justifyContent: "SpaceBetween",
                alignItems: "Center",
                items: [
                    new Label({ text: sLabel }),
                    new Text({ text: sValue })
                ]
            });
        },

        _createContactLine: function (sLabel, sValue) {
            return new HBox({
                class: "zuimmContactLine",
                justifyContent: "SpaceBetween",
                alignItems: "Center",
                items: [
                    new Label({ text: sLabel }),
                    new Text({ text: sValue })
                ]
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

        formatObjectState: function (sType) {
            switch (this._normalizeType(sType)) {
                case "PR":
                    return "Error";
                case "STOCK":
                    return "Warning";
                case "PO":
                    return "Information";
                default:
                    return "None";
            }
        },

        formatStateText: function (sType) {
            switch (this._normalizeType(sType)) {
                case "PR":
                    return "승인 대기";
                case "STOCK":
                    return "구매 필요";
                case "PO":
                    return "납품 확인";
                default:
                    return "신규";
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
