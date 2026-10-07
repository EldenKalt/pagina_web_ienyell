-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'ADMIN', 'PROVEEDOR', 'COLABORADOR');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('SOCIAL', 'VIDEO', 'DESIGN', 'WEB');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SERVICIO', 'DESCARGABLE', 'PERSONALIZABLE', 'PEDIDO_PERSONALIZADO');

-- CreateEnum
CREATE TYPE "DownloadAccessStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CUSTOMIZING', 'PENDING_APPROVAL', 'PREPARING', 'WAITING_SPECIFICATIONS', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditSource" AS ENUM ('PAYMENT', 'MANUAL_CREDIT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('PRODUCT', 'HOURS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('HOURS_REGISTERED', 'REPORT_READY', 'RENEWAL_ALERT', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "AvailStatus" AS ENUM ('AVAILABLE', 'WORKING', 'BUSY', 'OFF_HOURS');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('ADMIN', 'CLIENT', 'CONTACT', 'COLABORADOR');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "CallRequestStatus" AS ENUM ('PENDING', 'SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('PHONE', 'WHATSAPP', 'GOOGLE_MEET');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REGISTERED', 'REWARDED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('ONVO_SPLIT', 'MANUAL');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "InstallmentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskColumn" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "pronouns" TEXT,
    "bio" TEXT,
    "patreonUrl" TEXT,
    "socialLinks" JSONB,
    "phone" TEXT,
    "company" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" INTEGER,
    "discountTier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onvoSubAccountId" TEXT,
    "onvoCustomerId" TEXT,
    "onvoPaymentMethodId" TEXT,
    "morosoSince" TIMESTAMP(3),
    "morosoLiftedAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "assignedAgentId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'SERVICIO',
    "launchPrice" DECIMAL(65,30) NOT NULL,
    "regularPrice" DECIMAL(65,30),
    "description" TEXT,
    "details" TEXT,
    "specificationsUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proveedorId" INTEGER,
    "comisionUtil" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porcentajeHacienda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revisionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "includedRevisions" INTEGER NOT NULL DEFAULT 0,
    "extraRevisionPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "subscribable" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionInterval" "SubscriptionInterval",

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileHandleRedirect" (
    "handle" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileHandleRedirect_pkey" PRIMARY KEY ("handle")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("userId","productId")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDownloadFile" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "version" TEXT,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDownloadFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDownload" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "productId" INTEGER,
    "downloadFileId" INTEGER,
    "status" "DownloadAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "orderId" INTEGER,
    "cartOrderId" INTEGER,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProduct" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "status" "ContractStatus" NOT NULL,
    "totalHours" DOUBLE PRECISION,
    "hoursUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3),
    "price" DECIMAL(65,30) NOT NULL,
    "source" "CreditSource" NOT NULL DEFAULT 'PAYMENT',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "autoRenewNotifiedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ClientProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourEntry" (
    "id" SERIAL NOT NULL,
    "clientProductId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "task" TEXT NOT NULL,
    "description" TEXT,
    "hours" DOUBLE PRECISION NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "registeredById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HourEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourServiceCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "launchPricePerHour" DECIMAL(65,30) NOT NULL,
    "regularPricePerHour" DECIMAL(65,30) NOT NULL,
    "isLaunchActive" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculatorConfigSetting" (
    "id" SERIAL NOT NULL,
    "configId" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalculatorConfigSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculatorPriceOption" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "pricingMode" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "applyTo" TEXT NOT NULL DEFAULT 'base',
    "isPer" BOOLEAN NOT NULL DEFAULT false,
    "minimum" DOUBLE PRECISION,
    "exclusiveGroup" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalculatorPriceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WizardFlowSetting" (
    "id" SERIAL NOT NULL,
    "wizardId" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WizardFlowSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourBooking" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "hours" INTEGER NOT NULL,
    "priceTotal" DECIMAL(65,30) NOT NULL,
    "pricePerHour" DECIMAL(65,30) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "discountCodeId" INTEGER,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceCategoryId" INTEGER,
    "selectedCategories" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abandonmentNotifiedAt" TIMESTAMP(3),

    CONSTRAINT "HourBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" "OrderType" NOT NULL,
    "productId" INTEGER,
    "hourBookingId" INTEGER,
    "amountCRC" INTEGER NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountCodeId" INTEGER,
    "finalAmountCRC" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "abandonmentNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
    "acceptedTermsAt" TIMESTAMP(3),
    "acceptedTermsIp" TEXT,
    "acceptedTermsUserAgent" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotifType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminStatus" (
    "id" INTEGER NOT NULL,
    "status" "AvailStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schedule" JSONB NOT NULL,

    CONSTRAINT "AdminStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lastName" TEXT,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "deadlineEnd" TIMESTAMP(3),
    "knowsServices" BOOLEAN,
    "productInterest" TEXT,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "budgetPeriod" TEXT,
    "isUrgent" BOOLEAN,
    "wantsCustomService" BOOLEAN DEFAULT false,
    "serviceCategories" TEXT,
    "suggestedService" TEXT,
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "contactMessageId" INTEGER,
    "subject" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assignedAgentId" INTEGER,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderType" "MessageSender" NOT NULL,
    "senderUserId" INTEGER,
    "body" TEXT,
    "attachments" JSONB,
    "readByAdminAt" TIMESTAMP(3),
    "readByClientAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedAgentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCallRequest" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "status" "CallRequestStatus" NOT NULL DEFAULT 'PENDING',
    "suggestedSlots" JSONB NOT NULL,
    "preferredStart" TIMESTAMP(3),
    "selectedStart" TIMESTAMP(3),
    "selectedEnd" TIMESTAMP(3),
    "contactMethod" "ContactMethod",
    "calendarEventId" TEXT,
    "calendarHtmlLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "TicketCallRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverUrl" TEXT,
    "content" TEXT NOT NULL,
    "notesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" INTEGER NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedPostIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "relatedProductIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "seriesId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnotationTarget" (
    "id" SERIAL NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,

    CONSTRAINT "AnnotationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "userId" INTEGER,
    "rootId" INTEGER,
    "parentId" INTEGER,
    "body" TEXT NOT NULL,
    "selector" JSONB,
    "highlight" TEXT,
    "paragraphId" TEXT,
    "paragraphSnapshot" TEXT,
    "isUnassigned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedBlogPost" (
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedBlogPost_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "BlogPostLike" (
    "userId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPostLike_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "BlogCommentLike" (
    "userId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogCommentLike_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateTable
CREATE TABLE "CommentThreadAssignmentLog" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "fromParagraphId" TEXT,
    "toParagraphId" TEXT,
    "fromUnassigned" BOOLEAN NOT NULL,
    "toUnassigned" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentThreadAssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReaderNote" (
    "id" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "selector" JSONB,
    "paragraphId" TEXT,
    "paragraphSnapshot" TEXT,
    "sourceRevision" TEXT,
    "requestKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReaderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReaderHighlight" (
    "id" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "selector" JSONB NOT NULL,
    "selectorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReaderHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogSeries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT,
    "goal" TEXT,
    "audience" TEXT,
    "introPostId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogSeriesFeaturedPost" (
    "id" SERIAL NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogSeriesFeaturedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    "autoApplyToRole" "Role",
    "autoApplyToUsers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountUsage" (
    "id" SERIAL NOT NULL,
    "codeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" SERIAL NOT NULL,
    "referrerId" INTEGER NOT NULL,
    "referredEmail" TEXT NOT NULL,
    "referredId" INTEGER,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardCodeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "company" TEXT,
    "socialHandle" TEXT,
    "socialNetwork" TEXT,
    "avatarUrl" TEXT,
    "content" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartOrder" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "subtotalCRC" INTEGER NOT NULL,
    "discountCodeId" INTEGER,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmountCRC" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartOrderItem" (
    "id" SERIAL NOT NULL,
    "cartOrderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCRC" INTEGER NOT NULL,

    CONSTRAINT "CartOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderPayout" (
    "id" SERIAL NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "cartOrderId" INTEGER,
    "productId" INTEGER NOT NULL,
    "totalSale" INTEGER NOT NULL,
    "comisionUtil" DOUBLE PRECISION NOT NULL,
    "porcentajeHacienda" DOUBLE PRECISION NOT NULL,
    "amountUtil" INTEGER NOT NULL,
    "amountTax" INTEGER NOT NULL,
    "amountProvider" INTEGER NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCollaborator" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "collaboratorId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAddOn" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "maxQty" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAddOn" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER,
    "cartOrderItemId" INTEGER,
    "addOnId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCRC" INTEGER NOT NULL,

    CONSTRAINT "OrderAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionTracker" (
    "id" SERIAL NOT NULL,
    "clientProductId" INTEGER NOT NULL,
    "totalAllowed" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "extraPurchased" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RevisionTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductQuestion" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'TEXT',
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAnswer" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER,
    "cartOrderItemId" INTEGER,
    "questionId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "OrderAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioCategory" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "client" TEXT,
    "date" TEXT,
    "summary" TEXT NOT NULL,
    "approach" TEXT NOT NULL DEFAULT '',
    "budget" TEXT,
    "aspectRatio" TEXT NOT NULL DEFAULT '4/3',
    "liveUrl" TEXT,
    "showBrowserFrame" BOOLEAN NOT NULL DEFAULT false,
    "coverUrl" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "software" JSONB NOT NULL DEFAULT '[]',
    "technologies" JSONB NOT NULL DEFAULT '[]',
    "results" JSONB NOT NULL DEFAULT '[]',
    "content" JSONB NOT NULL DEFAULT '[]',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "cartOrderId" INTEGER,
    "description" TEXT NOT NULL,
    "totalAmountCRC" INTEGER NOT NULL,
    "numberOfInstallments" INTEGER NOT NULL,
    "status" "InstallmentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" SERIAL NOT NULL,
    "installmentPlanId" INTEGER NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "amountCRC" INTEGER NOT NULL,
    "penaltyFeeCRC" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentIntentId" TEXT,
    "checkoutUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "estimatedHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "column" "TaskColumn" NOT NULL DEFAULT 'TODO',
    "order" INTEGER NOT NULL DEFAULT 0,
    "assigneeId" INTEGER,
    "description" TEXT,
    "deadline" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubTask" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NsfwAccessRequest" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NsfwAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "confirmationTokenHash" TEXT,
    "confirmationExpiresAt" TIMESTAMP(3),
    "lastRequestAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "User_onvoCustomerId_key" ON "User"("onvoCustomerId");

-- CreateIndex
CREATE INDEX "ProfileHandleRedirect_userId_idx" ON "ProfileHandleRedirect"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_createdAt_productId_idx" ON "WishlistItem"("userId", "createdAt", "productId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductDownloadFile_productId_key" ON "ProductDownloadFile"("productId");

-- CreateIndex
CREATE INDEX "ClientDownload_clientId_productId_idx" ON "ClientDownload"("clientId", "productId");

-- CreateIndex
CREATE INDEX "ClientDownload_status_idx" ON "ClientDownload"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientDownload_clientId_downloadFileId_key" ON "ClientDownload"("clientId", "downloadFileId");

-- CreateIndex
CREATE UNIQUE INDEX "HourServiceCategory_slug_key" ON "HourServiceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatorConfigSetting_configId_key" ON "CalculatorConfigSetting"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "CalculatorPriceOption_key_key" ON "CalculatorPriceOption"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WizardFlowSetting_wizardId_key" ON "WizardFlowSetting"("wizardId");

-- CreateIndex
CREATE INDEX "HourBooking_clientId_createdAt_idx" ON "HourBooking"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "HourBooking_status_createdAt_idx" ON "HourBooking"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_hourBookingId_key" ON "Order"("hourBookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentIntentId_key" ON "Order"("paymentIntentId");

-- CreateIndex
CREATE INDEX "Order_clientId_createdAt_idx" ON "Order"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_contactMessageId_key" ON "Conversation"("contactMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_slug_key" ON "LegalPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_seriesId_publishedAt_idx" ON "BlogPost"("seriesId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnotationTarget_targetType_targetId_key" ON "AnnotationTarget"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "BlogComment_targetId_rootId_createdAt_id_idx" ON "BlogComment"("targetId", "rootId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "BlogComment_rootId_createdAt_id_idx" ON "BlogComment"("rootId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "BlogComment_targetId_paragraphId_idx" ON "BlogComment"("targetId", "paragraphId");

-- CreateIndex
CREATE INDEX "SavedBlogPost_userId_createdAt_postId_idx" ON "SavedBlogPost"("userId", "createdAt", "postId");

-- CreateIndex
CREATE INDEX "BlogPostLike_postId_idx" ON "BlogPostLike"("postId");

-- CreateIndex
CREATE INDEX "BlogCommentLike_commentId_idx" ON "BlogCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "CommentThreadAssignmentLog_threadId_createdAt_idx" ON "CommentThreadAssignmentLog"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ReaderNote_userId_targetId_createdAt_id_idx" ON "ReaderNote"("userId", "targetId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ReaderNote_targetId_isPublic_createdAt_id_idx" ON "ReaderNote"("targetId", "isPublic", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ReaderNote_userId_requestKey_key" ON "ReaderNote"("userId", "requestKey");

-- CreateIndex
CREATE INDEX "ReaderHighlight_userId_targetId_idx" ON "ReaderHighlight"("userId", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ReaderHighlight_userId_targetId_selectorKey_key" ON "ReaderHighlight"("userId", "targetId", "selectorKey");

-- CreateIndex
CREATE UNIQUE INDEX "BlogSeries_name_key" ON "BlogSeries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogSeries_slug_key" ON "BlogSeries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogSeries_introPostId_key" ON "BlogSeries"("introPostId");

-- CreateIndex
CREATE INDEX "BlogSeriesFeaturedPost_seriesId_position_idx" ON "BlogSeriesFeaturedPost"("seriesId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BlogSeriesFeaturedPost_seriesId_postId_key" ON "BlogSeriesFeaturedPost"("seriesId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountUsage_codeId_userId_key" ON "DiscountUsage"("codeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CartOrder_paymentIntentId_key" ON "CartOrder"("paymentIntentId");

-- CreateIndex
CREATE INDEX "CartOrder_clientId_createdAt_idx" ON "CartOrder"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "CartOrder_status_createdAt_idx" ON "CartOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderPayout_proveedorId_idx" ON "ProviderPayout"("proveedorId");

-- CreateIndex
CREATE INDEX "ProviderPayout_status_idx" ON "ProviderPayout"("status");

-- CreateIndex
CREATE INDEX "ProviderPayout_productId_idx" ON "ProviderPayout"("productId");

-- CreateIndex
CREATE INDEX "ClientCollaborator_collaboratorId_idx" ON "ClientCollaborator"("collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCollaborator_clientId_collaboratorId_key" ON "ClientCollaborator"("clientId", "collaboratorId");

-- CreateIndex
CREATE INDEX "ProductAddOn_productId_idx" ON "ProductAddOn"("productId");

-- CreateIndex
CREATE INDEX "OrderAddOn_orderId_idx" ON "OrderAddOn"("orderId");

-- CreateIndex
CREATE INDEX "OrderAddOn_cartOrderItemId_idx" ON "OrderAddOn"("cartOrderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionTracker_clientProductId_key" ON "RevisionTracker"("clientProductId");

-- CreateIndex
CREATE INDEX "ProductQuestion_productId_idx" ON "ProductQuestion"("productId");

-- CreateIndex
CREATE INDEX "OrderAnswer_orderId_idx" ON "OrderAnswer"("orderId");

-- CreateIndex
CREATE INDEX "OrderAnswer_cartOrderItemId_idx" ON "OrderAnswer"("cartOrderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioCategory_slug_key" ON "PortfolioCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProject_slug_key" ON "PortfolioProject"("slug");

-- CreateIndex
CREATE INDEX "PortfolioProject_isPublished_order_idx" ON "PortfolioProject"("isPublished", "order");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPlan_orderId_key" ON "InstallmentPlan"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPlan_cartOrderId_key" ON "InstallmentPlan"("cartOrderId");

-- CreateIndex
CREATE INDEX "InstallmentPlan_clientId_idx" ON "InstallmentPlan"("clientId");

-- CreateIndex
CREATE INDEX "InstallmentPlan_status_idx" ON "InstallmentPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Installment_paymentIntentId_key" ON "Installment"("paymentIntentId");

-- CreateIndex
CREATE INDEX "Installment_installmentPlanId_idx" ON "Installment"("installmentPlanId");

-- CreateIndex
CREATE INDEX "Installment_status_dueDate_idx" ON "Installment"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Project_status_priority_idx" ON "Project"("status", "priority");

-- CreateIndex
CREATE INDEX "Project_clientId_status_idx" ON "Project"("clientId", "status");

-- CreateIndex
CREATE INDEX "ProjectTask_projectId_column_order_idx" ON "ProjectTask"("projectId", "column", "order");

-- CreateIndex
CREATE INDEX "SubTask_taskId_order_idx" ON "SubTask"("taskId", "order");

-- CreateIndex
CREATE INDEX "NsfwAccessRequest_email_createdAt_idx" ON "NsfwAccessRequest"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileHandleRedirect" ADD CONSTRAINT "ProfileHandleRedirect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDownloadFile" ADD CONSTRAINT "ProductDownloadFile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDownloadFile" ADD CONSTRAINT "ProductDownloadFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDownload" ADD CONSTRAINT "ClientDownload_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDownload" ADD CONSTRAINT "ClientDownload_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDownload" ADD CONSTRAINT "ClientDownload_downloadFileId_fkey" FOREIGN KEY ("downloadFileId") REFERENCES "ProductDownloadFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDownload" ADD CONSTRAINT "ClientDownload_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDownload" ADD CONSTRAINT "ClientDownload_cartOrderId_fkey" FOREIGN KEY ("cartOrderId") REFERENCES "CartOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProduct" ADD CONSTRAINT "ClientProduct_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProduct" ADD CONSTRAINT "ClientProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourEntry" ADD CONSTRAINT "HourEntry_clientProductId_fkey" FOREIGN KEY ("clientProductId") REFERENCES "ClientProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourEntry" ADD CONSTRAINT "HourEntry_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourBooking" ADD CONSTRAINT "HourBooking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourBooking" ADD CONSTRAINT "HourBooking_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "HourServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_hourBookingId_fkey" FOREIGN KEY ("hourBookingId") REFERENCES "HourBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCallRequest" ADD CONSTRAINT "TicketCallRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCallRequest" ADD CONSTRAINT "TicketCallRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "BlogSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "AnnotationTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BlogComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBlogPost" ADD CONSTRAINT "SavedBlogPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBlogPost" ADD CONSTRAINT "SavedBlogPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogCommentLike" ADD CONSTRAINT "BlogCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogCommentLike" ADD CONSTRAINT "BlogCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThreadAssignmentLog" ADD CONSTRAINT "CommentThreadAssignmentLog_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentThreadAssignmentLog" ADD CONSTRAINT "CommentThreadAssignmentLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderNote" ADD CONSTRAINT "ReaderNote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "AnnotationTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderNote" ADD CONSTRAINT "ReaderNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderHighlight" ADD CONSTRAINT "ReaderHighlight_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "AnnotationTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReaderHighlight" ADD CONSTRAINT "ReaderHighlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogSeries" ADD CONSTRAINT "BlogSeries_introPostId_fkey" FOREIGN KEY ("introPostId") REFERENCES "BlogPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogSeriesFeaturedPost" ADD CONSTRAINT "BlogSeriesFeaturedPost_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "BlogSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogSeriesFeaturedPost" ADD CONSTRAINT "BlogSeriesFeaturedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_rewardCodeId_fkey" FOREIGN KEY ("rewardCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartOrder" ADD CONSTRAINT "CartOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartOrderItem" ADD CONSTRAINT "CartOrderItem_cartOrderId_fkey" FOREIGN KEY ("cartOrderId") REFERENCES "CartOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartOrderItem" ADD CONSTRAINT "CartOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPayout" ADD CONSTRAINT "ProviderPayout_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPayout" ADD CONSTRAINT "ProviderPayout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPayout" ADD CONSTRAINT "ProviderPayout_cartOrderId_fkey" FOREIGN KEY ("cartOrderId") REFERENCES "CartOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPayout" ADD CONSTRAINT "ProviderPayout_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCollaborator" ADD CONSTRAINT "ClientCollaborator_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCollaborator" ADD CONSTRAINT "ClientCollaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAddOn" ADD CONSTRAINT "ProductAddOn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAddOn" ADD CONSTRAINT "OrderAddOn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAddOn" ADD CONSTRAINT "OrderAddOn_cartOrderItemId_fkey" FOREIGN KEY ("cartOrderItemId") REFERENCES "CartOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAddOn" ADD CONSTRAINT "OrderAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "ProductAddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionTracker" ADD CONSTRAINT "RevisionTracker_clientProductId_fkey" FOREIGN KEY ("clientProductId") REFERENCES "ClientProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAnswer" ADD CONSTRAINT "OrderAnswer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAnswer" ADD CONSTRAINT "OrderAnswer_cartOrderItemId_fkey" FOREIGN KEY ("cartOrderItemId") REFERENCES "CartOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAnswer" ADD CONSTRAINT "OrderAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ProductQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_cartOrderId_fkey" FOREIGN KEY ("cartOrderId") REFERENCES "CartOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "InstallmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
